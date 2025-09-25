-- CreateTable
CREATE TABLE "public"."Lobby" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "started" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Lobby_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Player" (
    "id" TEXT NOT NULL,
    "gameName" TEXT NOT NULL,
    "tagLine" TEXT NOT NULL,
    "riotId" TEXT NOT NULL,
    "lobbyId" TEXT,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChampionMastery" (
    "id" TEXT NOT NULL,
    "championId" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "playerId" TEXT NOT NULL,

    CONSTRAINT "ChampionMastery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lobby_code_key" ON "public"."Lobby"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Player_riotId_key" ON "public"."Player"("riotId");

-- AddForeignKey
ALTER TABLE "public"."Player" ADD CONSTRAINT "Player_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "public"."Lobby"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChampionMastery" ADD CONSTRAINT "ChampionMastery_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
