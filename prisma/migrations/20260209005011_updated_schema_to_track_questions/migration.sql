-- CreateTable
CREATE TABLE "PlayerQuestionHistory" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerQuestionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlayerQuestionHistory_playerId_idx" ON "PlayerQuestionHistory"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerQuestionHistory_playerId_questionType_key" ON "PlayerQuestionHistory"("playerId", "questionType");

-- AddForeignKey
ALTER TABLE "PlayerQuestionHistory" ADD CONSTRAINT "PlayerQuestionHistory_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
