/*
  Warnings:

  - You are about to drop the column `reservationId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `orderNo` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `reservations` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[orderId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `orderId` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orderId` to the `reservations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitPrice` to the `reservations` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_reservationId_fkey";

-- DropForeignKey
ALTER TABLE "reservations" DROP CONSTRAINT "reservations_userId_fkey";

-- DropIndex
DROP INDEX "payments_reservationId_key";

-- DropIndex
DROP INDEX "reservations_orderNo_key";

-- DropIndex
DROP INDEX "reservations_userId_idx";

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "reservationId",
ADD COLUMN     "failCode" TEXT,
ADD COLUMN     "orderId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "reservations" DROP COLUMN "deletedAt",
DROP COLUMN "orderNo",
DROP COLUMN "status",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "orderId" UUID NOT NULL,
ADD COLUMN     "unitPrice" INTEGER NOT NULL;

-- DropEnum
DROP TYPE "ReservationStatus";

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "orderNo" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "concertId" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNo_key" ON "orders"("orderNo");

-- CreateIndex
CREATE INDEX "orders_userId_concertId_idx" ON "orders"("userId", "concertId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_orderId_key" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX "reservations_orderId_idx" ON "reservations"("orderId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_concertId_fkey" FOREIGN KEY ("concertId") REFERENCES "concerts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
