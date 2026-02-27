# Bill Reminders and Due-Soon Notifications

This document outlines the implementation of bill reminders and due-soon notifications in the Remitwise Frontend.

## Overview

The system provides two mechanisms for handling bill reminders:
1. **Real-time Polling (Option A)**: Frontend can fetch bills due soon directly from the API, which filters data from the Soroban contract.
2. **Scheduled Reminders (Option B)**: A cron job runs periodically, scans all users' bills, and populates a database table for persistent notifications.

## API Endpoints

### 1. Due-Soon Bills (Polling)
- **Endpoint**: `GET /api/bills/due-soon`
- **Auth**: Required
- **Description**: Fetches bills due within the next 7 days or already overdue.
- **Query Params**:
  - `owner` (optional): User's Stellar address. Defaults to current session.
- **Response**:
  ```json
  {
    "success": true,
    "message": "Due-soon bills retrieved successfully",
    "count": 2,
    "bills": [
      {
        "billId": "2",
        "name": "Rent Payment",
        "amount": 800,
        "dueDate": "2026-02-01T00:00:00.000Z",
        "status": "urgent"
      }
    ]
  }
  ```

### 2. Notifications (Stored Reminders)
- **Endpoint**: `GET /api/notifications/reminders`
- **Auth**: Required
- **Description**: Returns stored notifications for the user.
- **Query Params**:
  - `unread` (optional): Filter specifically for unread reminders (`true`).

- **Endpoint**: `PATCH /api/notifications/reminders`
- **Auth**: Required
- **Description**: Mark a reminder as read.
- **Body**: `{ "reminderId": "...", "all": false }`

### 3. Cron Job (Populator)
- **Endpoint**: `GET /api/bills/cron/reminders`
- **Auth**: `Bearer <CRON_SECRET>` header.
- **Description**: Designed for Vercel Cron. Scans all active users and generates `BillReminder` records for any bill due within 7 days.
- **Logic**:
  - Scans users with `notifications_enabled: true`.
  - Filters bills due <= 7 days from now.
  - Prevents duplicate notifications for the same bill within a 24h window.

## Database Schema

The `BillReminder` model in Prisma tracks these notifications:
```prisma
model BillReminder {
  id        String   @id @default(cuid())
  billId    String
  name      String
  amount    Float
  dueDate   DateTime
  userId    String
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

## Implementation Strategy

- **Defined "Due Soon"**: 7 days (604,800,000 ms).
- **Polling vs Cron**: The frontend should primarily use `GET /api/notifications/reminders` to show a notification dot/list, and can use `GET /api/bills/due-soon` for specific "Due Soon" dashboard widgets.
