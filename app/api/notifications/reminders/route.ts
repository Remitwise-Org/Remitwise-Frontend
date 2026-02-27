import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth";
import prisma from "@/lib/db";
import { jsonSuccess, jsonError } from "@/lib/api/types";

/**
 * GET /api/notifications/reminders
 * Fetches stored bill reminders for the authenticated user.
 */
async function getRemindersHandler(request: NextRequest, session: string) {
    try {
        const { searchParams } = new URL(request.url);
        const owner = searchParams.get("owner") ?? session;
        const unreadOnly = searchParams.get("unread") === "true";

        const reminders = await prisma.billReminder.findMany({
            where: {
                userId: owner,
                ...(unreadOnly ? { isRead: false } : {}),
            },
            orderBy: {
                dueDate: "asc",
            },
            select: {
                id: true,
                billId: true,
                name: true,
                amount: true,
                dueDate: true,
                isRead: true,
                createdAt: true,
            }
        });

        return jsonSuccess({
            message: "Reminders retrieved successfully",
            count: reminders.length,
            reminders,
        });
    } catch (err) {
        console.error("[GET /api/notifications/reminders]", err);
        return jsonError("INTERNAL_ERROR", "Failed to fetch reminders");
    }
}

/**
 * PATCH /api/notifications/reminders
 * Marks specific reminder as read.
 */
async function markAsReadHandler(request: NextRequest, session: string) {
    try {
        const body = await request.json();
        const { reminderId, all = false } = body;

        if (all) {
            await prisma.billReminder.updateMany({
                where: { userId: session, isRead: false },
                data: { isRead: true }
            });
            return jsonSuccess({ message: "All reminders marked as read" });
        }

        if (!reminderId) {
            return jsonError("VALIDATION_ERROR", "reminderId is required unless 'all' is true");
        }

        await prisma.billReminder.update({
            where: { id: reminderId, userId: session },
            data: { isRead: true }
        });

        return jsonSuccess({ message: "Reminder marked as read" });
    } catch (err) {
        console.error("[PATCH /api/notifications/reminders]", err);
        return jsonError("INTERNAL_ERROR", "Failed to update reminder");
    }
}

export const GET = withAuth(getRemindersHandler);
export const PATCH = withAuth(markAsReadHandler);
