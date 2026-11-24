-- Add IdempotencyRecord table for Prisma-backed idempotency store.
-- key is the primary key so the unique constraint + DB-level serialisation
-- gives us one-winner semantics for concurrent first-use of the same key.
CREATE TABLE "IdempotencyRecord" (
    "key"          TEXT     NOT NULL PRIMARY KEY,
    "requestHash"  TEXT     NOT NULL,
    "responseBody" TEXT     NOT NULL,
    "statusCode"   INTEGER  NOT NULL,
    "expiresAt"    DATETIME NOT NULL,
    "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
