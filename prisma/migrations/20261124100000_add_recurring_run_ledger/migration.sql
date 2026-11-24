CREATE TABLE "RecurringRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT NOT NULL,
    "dueAt" DATETIME NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecurringRun_scheduleId_fkey"
      FOREIGN KEY ("scheduleId") REFERENCES "RecurringRemittance" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RecurringRun_scheduleId_dueAt_key"
  ON "RecurringRun"("scheduleId", "dueAt");

CREATE INDEX "RecurringRun_status_dueAt_idx"
  ON "RecurringRun"("status", "dueAt");
