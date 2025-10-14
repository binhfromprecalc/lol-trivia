import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  // Map platformRegion to region code used in our database
  const regionMap: Record<string, string> = {
          NA1: 'na1', EUW1: 'euw1', KR: 'kr', EUN1: 'eun1',
          JP1: 'jp1', BR1: 'br1', OC1: 'oc1', RU: 'ru',
          TR1: 'tr1', LA1: 'la1', LA2: 'la2',
        };
  try {
    const {
      account,
      summoner,
      rankedEntries,
      masteries,
      winrate,
      gameName,
      tagLine,
    } = req.body;

    // Basic validation
    if (!account || !summoner || !gameName || !tagLine) {
      return res.status(400).json({ error: "Missing required player data" });
    }
    const region = regionMap[tagLine.toUpperCase()] || 'na1';

    // Step 1: Upsert player info
    const player = await prisma.player.upsert({
      where: { riotId: `${gameName}#${tagLine}` },
      update: {
        puuid: account.puuid,
        region,
        rank: rankedEntries?.[0]?.tier ?? "UNRANKED",
        winrate: parseFloat(winrate.winrate),
        mostKills: winrate.mostKills,
        mostDeaths: winrate.mostDeaths,
        profileIconId: summoner.profileIconId,
        summonerLevel: summoner.summonerLevel,
      },
      create: {
        riotId: `${gameName}#${tagLine}`,
        gameName,
        tagLine,
        puuid: account.puuid,
        region,
        rank: rankedEntries?.[0]?.tier ?? "UNRANKED",
        winrate: parseFloat(winrate.winrate),
        mostKills: winrate.mostKills,
        mostDeaths: winrate.mostDeaths,
        profileIconId: summoner.profileIconId,
        summonerLevel: summoner.summonerLevel,
      },
    });

    // Step 2: Upsert champion masteries
    const masteryEntries = Object.entries(masteries || {});
    await Promise.all(
      masteryEntries.map(async ([championId, data]) => {
        const mastery = data as { championPoints: number };
        await prisma.championMastery.upsert({
          where: {
            playerId_championId: {
              playerId: player.id,
              championId: Number(championId),
            },
          },
          update: {
            championPoints: mastery.championPoints,
          },
          create: {
            playerId: player.id,
            championId: Number(championId),
            championPoints: mastery.championPoints,
          },
        });
      })
    );

    return res.status(200).json({ success: true, playerId: player.id });
  } catch (error) {
    console.error("Error in /api/sync:", error);
    return res.status(500).json({ error: "Failed to sync player data" });
  }
}
