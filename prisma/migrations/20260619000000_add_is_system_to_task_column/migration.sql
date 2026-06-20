-- AlterTable
ALTER TABLE "TaskColumn" ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing system columns (To Do, In Progress, Done)
UPDATE "TaskColumn"
SET "isSystem" = true
WHERE "name" IN ('To Do', 'In Progress', 'Done');
