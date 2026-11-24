-- AddColumn: sessionVersion on User
-- Adds a monotonically-increasing session version counter used to
-- invalidate all existing sessions for a user (sign out everywhere).
-- Default 0 means every existing row gets version 0, which matches
-- the legacy cookie handling (no version = treat as 0).

ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
