/*
  Warnings:

  - Added the required column `endsAt` to the `concerts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "concerts" ADD COLUMN     "ageLimit" TEXT,
ADD COLUMN     "endsAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "notice" TEXT,
ADD COLUMN     "posterUrl" TEXT;
