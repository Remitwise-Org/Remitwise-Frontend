-- Add soft delete support to User table
-- Migration: Add deletedAt field and index for soft delete functionality

-- Add deletedAt column to User table
ALTER TABLE "User" ADD COLUMN "deletedAt" DATETIME;

-- Create index on deletedAt for efficient queries on active users
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
