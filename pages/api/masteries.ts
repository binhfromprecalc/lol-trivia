import type { NextApiRequest, NextApiResponse } from 'next';
import { getChampionMasteriesByPUUID } from './lib/riot';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { puuid, platformRegion } = req.query;

  if (!puuid || typeof puuid !== 'string' || !platformRegion || typeof platformRegion !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid puuid or platformRegion' });
  }

  try {
    const masteries = await getChampionMasteriesByPUUID(puuid, platformRegion);
    res.status(200).json(masteries);
  } catch (error: any) {
    console.error('Mastery API error:', error?.response?.data || error.message || error);
    res.status(500).json({ error: 'Failed to fetch champion masteries' });
  }
}