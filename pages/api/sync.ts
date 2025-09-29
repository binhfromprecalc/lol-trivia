import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "./lib/prisma";
import { getAccountByRiotId, getSummonerByPUUID, getChampionMasteriesByPUUID, getRankedEntriesByPUUID } from "./lib/riot";

const regionMap: Record<string, string> = {
          NA1: 'na1', EUW1: 'euw1', KR: 'kr', EUN1: 'eun1',
          JP1: 'jp1', BR1: 'br1', OC1: 'oc1', RU: 'ru',
          TR1: 'tr1', LA1: 'la1', LA2: 'la2',
        };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { gameName, tagLine} = req.body;
  const platformRegion = regionMap[tagLine.toUpperCase()] || 'na1';

  if (!gameName || !tagLine) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // 1. Account info
    const account = await getAccountByRiotId(gameName, tagLine);

    // 2. Summoner info
    const summoner = await getSummonerByPUUID(account.puuid);

    // 3. Champion masteries
    const masteries = await getChampionMasteriesByPUUID(account.puuid, platformRegion);

    // 4. Ranked entries
    const ranked = await getRankedEntriesByPUUID(account.puuid, platformRegion);


    // add Player to db
    const player = await prisma.player.upsert({
      where: { riotId: account.puuid },
      update: {
        gameName,
        tagLine,
        summonerName: summoner.name,
      },
      create: {
        riotId: account.puuid,
        gameName,
        tagLine,
        summonerName: summoner.name,
      },
    });

    // Save masteries
    await prisma.championMastery.createMany({
      data: Object.entries(masteries).map(([championId, { championPoints }]) => ({
        championId: parseInt(championId),
        points: championPoints,
        playerId: player.id,
      })),
    });


    res.status(200).json({
      message: "Player synced successfully",
      player,
      ranked,
    });
  } catch (err) {
    console.error("Sync failed:", err);
    res.status(500).json({ error: "Failed to sync player" });
  }
}
