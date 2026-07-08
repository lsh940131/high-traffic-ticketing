-- AlterTable
ALTER TABLE "concerts" ADD COLUMN     "detailImages" TEXT[] DEFAULT ARRAY[]::TEXT[];
