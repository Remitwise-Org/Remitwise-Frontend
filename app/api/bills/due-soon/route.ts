import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth";
import { getUnpaidBills } from "@/lib/contracts/bill-payments";
import { jsonSuccess, jsonError } from "@/lib/api/types";

const DUE_SOON_DAYS = 7;

async function getDueSoonBillsHandler(request: NextRequest, session: string) {
    try {
        const { searchParams } = new URL(request.url);
        const owner = searchParams.get("owner") ?? session;

        // Fetch all unpaid bills
        const unpaidBills = await getUnpaidBills(owner);

        const now = Date.now();
        const sevenDaysFromNow = now + DUE_SOON_DAYS * 24 * 60 * 60 * 1000;

        // Filter bills that are due within the next 7 days or overdue
        const dueSoonBills = unpaidBills
            .filter((b) => {
                const dueDate = new Date(b.dueDate).getTime();
                return dueDate <= sevenDaysFromNow;
            })
            .map((b) => ({
                billId: b.id,
                name: b.name,
                amount: b.amount,
                dueDate: b.dueDate,
                status: b.status,
            }));

        return jsonSuccess({
            message: "Due-soon bills retrieved successfully",
            count: dueSoonBills.length,
            bills: dueSoonBills
        });
    } catch (err) {
        console.error("[GET /api/bills/due-soon]", err);
        return jsonError("INTERNAL_ERROR", "Failed to fetch due-soon bills");
    }
}

export const GET = withAuth(getDueSoonBillsHandler);
