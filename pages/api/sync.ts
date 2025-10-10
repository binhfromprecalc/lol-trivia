import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "./lib/prisma";
import { getAccountByRiotId, getSummonerByPUUID, getChampionMasteriesByPUUID, getRankedEntriesByPUUID,getWinrateByPUUID } from "./lib/riot";
import { platform } from "os";

const regionMap: Record<string, string> = {
          NA1: 'na1', EUW1: 'euw1', KR: 'kr', EUN1: 'eun1',
          JP1: 'jp1', BR1: 'br1', OC1: 'oc1', RU: 'ru',
          TR1: 'tr1', LA1: 'la1', LA2: 'la2',
        };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    let { gameName, tagLine } = req.body;
    const platformRegion = regionMap[tagLine]|| "na1"; // default to na1 if not provided

    if (!gameName || !tagLine) {
      return res.status(400).json({ error: "Missing gameName or tagLine" });
    }

    // Step 1: Fetch base account info
    const account = await getAccountByRiotId(gameName, tagLine);
    const summoner = await getSummonerByPUUID(account.puuid);
    const rankedEntries = await getRankedEntriesByPUUID(account.puuid, platformRegion);
    const masteries = await getChampionMasteriesByPUUID(account.puuid, platformRegion);
    const winrate = await getWinrateByPUUID(account.puuid, platformRegion);

    // Step 2: Upsert player info
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

    // Step 3: Upsert champion masteries
    const masteryEntries = Object.entries(masteries); // [championId, {championLevel, championPoints}]
    await Promise.all(
      masteryEntries.map(async ([championId, data]) => {
        await prisma.championMastery.upsert({
          where: {
            playerId_championId: {
              playerId: player.id,
              championId: Number(championId),
            },
          },
          update: {
            championPoints: data.championPoints,
          },
          create: {
            playerId: player.id,
            championId: Number(championId),
            championPoints: data.championPoints,
          },
        });
      })
    );

    return res.status(200).json({ success: true, playerId: player.id });
  } catch (error: any) {
    console.error("Error in /api/sync:", error);
    return res.status(500).json({ error: "Failed to sync player data" });
  }
}