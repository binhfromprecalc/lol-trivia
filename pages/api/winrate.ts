import type { NextApiRequest, NextApiResponse } from 'next';
import { getWinrateByPUUID } from '../../lib/riot';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { puuid, platformRegion } = req.query;

  if (!puuid || !platformRegion || typeof puuid !== 'string' || typeof platformRegion !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid parameters: puuid or platformRegion' });
  }

  try {
    const winrateData = await getWinrateByPUUID(puuid, platformRegion);
    res.status(200).json(winrateData);
  } catch (err: any) {
    console.error('Winrate API error:', err);
    res.status(500).json({ error: 'Failed to fetch winrate data' });
  }
}