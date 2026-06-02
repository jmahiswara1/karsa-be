/*
  Warnings:

  - You are about to drop the column `type` on the `AISuggestion` table. All the data in the column will be lost.
  - You are about to drop the column `entity` on the `ActivityLog` table. All the data in the column will be lost.
  - You are about to drop the column `plan` on the `DailyPlan` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `DailyPlan` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `Note` table. All the data in the column will be lost.
  - The `source` column on the `Note` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `read` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `processed` on the `QuickCapture` table. All the data in the column will be lost.
  - You are about to drop the column `sent` on the `Reminder` table. All the data in the column will be lost.
  - You are about to drop the column `time` on the `Reminder` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `avatar` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `refreshToken` on the `User` table. All the data in the column will be lost.
  - Added the required column `suggestionType` to the `AISuggestion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entityType` to the `ActivityLog` table without a default value. This is not possible if the table is not empty.
  - Made the column `entityId` on table `ActivityLog` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `focusTasks` to the `DailyPlan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lightTasks` to the `DailyPlan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tasksToDefer` to the `DailyPlan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workloadLevel` to the `DailyPlan` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `mood` on the `MoodLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `type` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reminderTime` to the `Reminder` table without a default value. This is not possible if the table is not empty.
  - Made the column `name` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "Mood" AS ENUM ('CALM', 'NEUTRAL', 'TIRED', 'STRESSED', 'FOCUSED');

-- DropForeignKey
ALTER TABLE "AISuggestion" DROP CONSTRAINT "AISuggestion_userId_fkey";

-- DropForeignKey
ALTER TABLE "ActivityLog" DROP CONSTRAINT "ActivityLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "DailyPlan" DROP CONSTRAINT "DailyPlan_userId_fkey";

-- DropForeignKey
ALTER TABLE "MoodLog" DROP CONSTRAINT "MoodLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "Note" DROP CONSTRAINT "Note_userId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_userId_fkey";

-- DropForeignKey
ALTER TABLE "QuickCapture" DROP CONSTRAINT "QuickCapture_userId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserPreference" DROP CONSTRAINT "UserPreference_userId_fkey";

-- AlterTable
ALTER TABLE "AISuggestion" DROP COLUMN "type",
ADD COLUMN     "dailyPlanId" TEXT,
ADD COLUMN     "isAccepted" BOOLEAN,
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "suggestionType" TEXT NOT NULL,
ADD COLUMN     "taskId" TEXT;

-- AlterTable
ALTER TABLE "ActivityLog" DROP COLUMN "entity",
ADD COLUMN     "details" JSONB,
ADD COLUMN     "entityType" TEXT NOT NULL,
ALTER COLUMN "entityId" SET NOT NULL;

-- AlterTable
ALTER TABLE "DailyPlan" DROP COLUMN "plan",
DROP COLUMN "updatedAt",
ADD COLUMN     "aiNote" TEXT,
ADD COLUMN     "focusTasks" JSONB NOT NULL,
ADD COLUMN     "lightTasks" JSONB NOT NULL,
ADD COLUMN     "tasksToDefer" JSONB NOT NULL,
ADD COLUMN     "workloadLevel" TEXT NOT NULL,
ALTER COLUMN "date" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "MoodLog" ADD COLUMN     "note" TEXT,
DROP COLUMN "mood",
ADD COLUMN     "mood" "Mood" NOT NULL;

-- AlterTable
ALTER TABLE "Note" DROP COLUMN "tags",
DROP COLUMN "source",
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "read",
ADD COLUMN     "isRead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "tags";

-- AlterTable
ALTER TABLE "QuickCapture" DROP COLUMN "processed",
ADD COLUMN     "isProcessed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Reminder" DROP COLUMN "sent",
DROP COLUMN "time",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderTime" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "tags";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "avatar",
DROP COLUMN "refreshToken",
ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "password" TEXT,
ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "googleId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "UserPreference" ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pushNotifications" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "language" SET DEFAULT 'id';

-- DropEnum
DROP TYPE "MoodType";

-- DropEnum
DROP TYPE "NoteSource";

-- DropEnum
DROP TYPE "SuggestionType";

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TagToTask" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TagToTask_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProjectToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProjectToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_NoteToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_NoteToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "_TagToTask_B_index" ON "_TagToTask"("B");

-- CreateIndex
CREATE INDEX "_ProjectToTag_B_index" ON "_ProjectToTag"("B");

-- CreateIndex
CREATE INDEX "_NoteToTag_B_index" ON "_NoteToTag"("B");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuickCapture" ADD CONSTRAINT "QuickCapture_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPlan" ADD CONSTRAINT "DailyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodLog" ADD CONSTRAINT "MoodLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AISuggestion" ADD CONSTRAINT "AISuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AISuggestion" ADD CONSTRAINT "AISuggestion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AISuggestion" ADD CONSTRAINT "AISuggestion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AISuggestion" ADD CONSTRAINT "AISuggestion_dailyPlanId_fkey" FOREIGN KEY ("dailyPlanId") REFERENCES "DailyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TagToTask" ADD CONSTRAINT "_TagToTask_A_fkey" FOREIGN KEY ("A") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TagToTask" ADD CONSTRAINT "_TagToTask_B_fkey" FOREIGN KEY ("B") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectToTag" ADD CONSTRAINT "_ProjectToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectToTag" ADD CONSTRAINT "_ProjectToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NoteToTag" ADD CONSTRAINT "_NoteToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NoteToTag" ADD CONSTRAINT "_NoteToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
