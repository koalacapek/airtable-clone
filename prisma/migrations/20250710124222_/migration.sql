/*
  Warnings:

  - You are about to drop the `View` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "View" DROP CONSTRAINT "View_baseId_fkey";

-- DropForeignKey
ALTER TABLE "View" DROP CONSTRAINT "View_tableId_fkey";

-- DropTable
DROP TABLE "View";
