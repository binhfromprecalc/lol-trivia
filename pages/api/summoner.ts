import type { NextApiRequest, NextApiResponse } from 'next';
import { getSummonerByName, getChampionMastery } from '../../lib/riot';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { name } = req.query;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid summoner name' });
  }

  try {
    const summoner = await getSummonerByName(name);
    const mastery = await getChampionMastery(summoner.id);
    const top3 = mastery.slice(0, 3);

    res.status(200).json({
      name: summoner.name,
      level: summoner.summonerLevel,
      topChampions: top3.map((c: any) => ({
        champId: c.championId,
        masteryPoints: c.championPoints,
      })),
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch summoner data' });
  }
}