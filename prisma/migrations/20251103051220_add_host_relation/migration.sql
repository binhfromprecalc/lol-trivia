/*
  Warnings:

  - You are about to drop the column `points` on the `ChampionMastery` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[playerId,championId]` on the table `ChampionMastery` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[hostId]` on the table `Lobby` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `championPoints` to the `ChampionMastery` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ChampionMastery" DROP COLUMN "points",
ADD COLUMN     "championPoints" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Lobby" ADD COLUMN     "hostId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ChampionMastery_playerId_championId_key" ON "ChampionMastery"("playerId", "championId");

-- CreateIndex
CREATE UNIQUE INDEX "Lobby_hostId_key" ON "Lobby"("hostId");

-- AddForeignKey
ALTER TABLE "Lobby" ADD CONSTRAINT "Lobby_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
