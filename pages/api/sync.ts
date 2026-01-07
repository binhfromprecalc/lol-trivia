import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const {
      account,
      summoner,
      rankedEntries,
      masteries,
      winrate,
      gameName,
      tagLine,
      platformRegion,
    } = req.body;

    if (!account || !summoner || !gameName || !tagLine) {
      return res.status(400).json({ error: "Missing required player data" });
    }

    const player = await prisma.player.upsert({
      where: { riotId: `${gameName}#${tagLine}` },
      update: {
        puuid: account.puuid,
        region: platformRegion,
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
        region: platformRegion,
        rank: rankedEntries?.[0]?.tier ?? "UNRANKED",
        winrate: parseFloat(winrate.winrate),
        mostKills: winrate.mostKills,
        mostDeaths: winrate.mostDeaths,
        profileIconId: summoner.profileIconId,
        summonerLevel: summoner.summonerLevel,
      },
    });

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
