import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUnpaidBills } from "@/lib/contracts/bill-payments";

const DUE_SOON_DAYS = 7;
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/bills/cron/reminders
 * Trigger logic to scan bills and populate reminders DB.
 * Designed to be called by a cron scheduler (e.g. Vercel Cron).
 */
export async function GET(request: NextRequest) {
    // 1. Auth check for Cron
    const authHeader = request.headers.get("authorization");
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        // 2. Fetch all users who have notifications enabled
        const users = await prisma.user.findMany({
            where: {
                preferences: {
                    notifications_enabled: true,
                },
            },
            include: {
                preferences: true,
            },
        });

        const now = Date.now();
        const sevenDaysFromNow = now + DUE_SOON_DAYS * 24 * 60 * 60 * 1000;
        let totalRemindersCreated = 0;

        for (const user of users) {
            try {
                // 3. Fetch user's unpaid bills from the contract/mock
                const unpaidBills = await getUnpaidBills(user.stellar_address);

                // 4. Identify bills due soon
                const dueSoonBills = unpaidBills.filter((b) => {
                    const dueDate = new Date(b.dueDate).getTime();
                    return dueDate <= sevenDaysFromNow;
                });

                // 5. Create reminders if they don't already exist for this bill + user + timeframe
                // (Avoiding duplicate reminders for the same bill if already notified recently)
                for (const bill of dueSoonBills) {
                    const existingReminder = await prisma.billReminder.findFirst({
                        where: {
                            userId: user.stellar_address,
                            billId: bill.id,
                            // If we already created a reminder in the last 24h, skip
                            createdAt: {
                                gt: new Date(Date.now() - 24 * 60 * 60 * 1000),
                            },
                        },
                    });

                    if (!existingReminder) {
                        await prisma.billReminder.create({
                            data: {
                                userId: user.stellar_address,
                                billId: bill.id,
                                name: bill.name,
                                amount: bill.amount,
                                dueDate: new Date(bill.dueDate),
                            },
                        });
                        totalRemindersCreated++;
                    }
                }
            } catch (userErr) {
                console.error(`Failed to process reminders for user ${user.stellar_address}:`, userErr);
            }
        }

        return NextResponse.json({
            success: true,
            processedUsers: users.length,
            remindersCreated: totalRemindersCreated,
        });
    } catch (err) {
        console.error("[CRON /api/bills/cron/reminders]", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
