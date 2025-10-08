/*
  Warnings:

  - Added the required column `updatedAt` to the `Player` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Player" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "mostDeaths" INTEGER,
ADD COLUMN     "mostKills" INTEGER,
ADD COLUMN     "profileIconId" INTEGER,
ADD COLUMN     "puuid" TEXT,
ADD COLUMN     "rank" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "summonerLevel" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "winrate" DOUBLE PRECISION;
