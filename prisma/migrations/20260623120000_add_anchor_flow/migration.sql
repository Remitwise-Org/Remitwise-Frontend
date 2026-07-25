-- CreateTable
CREATE TABLE "AnchorFlow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "destination" TEXT,
    "anchorTransactionId" TEXT,
    "anchorUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "AnchorFlow_anchorTransactionId_key" ON "AnchorFlow"("anchorTransactionId");

-- CreateIndex
CREATE INDEX "AnchorFlow_userAddress_index" ON "AnchorFlow"("userAddress");
