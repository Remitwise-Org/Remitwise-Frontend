-- Migrate RecurringRemittance.amount (Float) to amountStroops (BigInt)
-- Stellar amounts have 7 decimal places (1 XLM = 10,000,000 stroops).
-- We backfill by rounding the existing float to the nearest stroop.

-- Step 1: add the new column (nullable to allow backfill)
ALTER TABLE "RecurringRemittance" ADD COLUMN "amountStroops" INTEGER;

-- Step 2: backfill from the existing float column
UPDATE "RecurringRemittance"
SET "amountStroops" = CAST(ROUND("amount" * 10000000) AS INTEGER);

-- Step 3: make the column NOT NULL now that all rows are populated
-- SQLite does not support ALTER COLUMN, so we enforce via application layer
-- (Prisma will validate at the application boundary).

-- Step 4: drop the old column
-- (SQLite also does not support DROP COLUMN in older versions;
--  for portability the application ignores the old column via Prisma mapping)
