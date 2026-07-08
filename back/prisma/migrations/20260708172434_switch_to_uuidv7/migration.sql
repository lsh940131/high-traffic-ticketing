/*
  Warnings:

  - The primary key for the `concerts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `outbox` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `payments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `reservations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `tickets` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `venue_seats` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `venues` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `concerts` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `venueId` on the `concerts` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `outbox` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `aggregateId` on the `outbox` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `payments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `reservationId` on the `payments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `reservations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `reservations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `ticketId` on the `reservations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `tickets` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `concertId` on the `tickets` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `seatId` on the `tickets` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `venue_seats` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `venueId` on the `venue_seats` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `venues` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "concerts" DROP CONSTRAINT "concerts_venueId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_reservationId_fkey";

-- DropForeignKey
ALTER TABLE "reservations" DROP CONSTRAINT "reservations_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "reservations" DROP CONSTRAINT "reservations_userId_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_concertId_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_seatId_fkey";

-- DropForeignKey
ALTER TABLE "venue_seats" DROP CONSTRAINT "venue_seats_venueId_fkey";

-- AlterTable
ALTER TABLE "concerts" DROP CONSTRAINT "concerts_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "venueId",
ADD COLUMN     "venueId" UUID NOT NULL,
ADD CONSTRAINT "concerts_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "outbox" DROP CONSTRAINT "outbox_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "aggregateId",
ADD COLUMN     "aggregateId" UUID NOT NULL,
ADD CONSTRAINT "outbox_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "payments" DROP CONSTRAINT "payments_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "reservationId",
ADD COLUMN     "reservationId" UUID NOT NULL,
ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "reservations" DROP CONSTRAINT "reservations_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL,
DROP COLUMN "ticketId",
ADD COLUMN     "ticketId" UUID NOT NULL,
ADD CONSTRAINT "reservations_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "concertId",
ADD COLUMN     "concertId" UUID NOT NULL,
DROP COLUMN "seatId",
ADD COLUMN     "seatId" UUID NOT NULL,
ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "venue_seats" DROP CONSTRAINT "venue_seats_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "venueId",
ADD COLUMN     "venueId" UUID NOT NULL,
ADD CONSTRAINT "venue_seats_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "venues" DROP CONSTRAINT "venues_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "venues_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_reservationId_key" ON "payments"("reservationId");

-- CreateIndex
CREATE INDEX "reservations_userId_idx" ON "reservations"("userId");

-- CreateIndex
CREATE INDEX "reservations_ticketId_idx" ON "reservations"("ticketId");

-- CreateIndex
CREATE INDEX "tickets_concertId_status_idx" ON "tickets"("concertId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_concertId_seatId_key" ON "tickets"("concertId", "seatId");

-- CreateIndex
CREATE UNIQUE INDEX "venue_seats_venueId_floor_section_seatRow_seatNo_key" ON "venue_seats"("venueId", "floor", "section", "seatRow", "seatNo");

-- AddForeignKey
ALTER TABLE "venue_seats" ADD CONSTRAINT "venue_seats_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concerts" ADD CONSTRAINT "concerts_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_concertId_fkey" FOREIGN KEY ("concertId") REFERENCES "concerts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "venue_seats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
