import type { NextApiRequest, NextApiResponse } from 'next';
import { getWinrateByPUUID } from '@lib/riot';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { puuid, queueType } = req.query;

  if (!puuid || typeof puuid !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid parameters: puuid' });
  }

  let parsedQueueType: number | undefined;
  if (queueType !== undefined) {
    if (typeof queueType !== 'string' || !/^\d+$/.test(queueType)) {
      return res.status(400).json({ error: 'Invalid queueType. Expected numeric queue id.' });
    }
    parsedQueueType = Number(queueType);
  }

  try {
    const winrateData = await getWinrateByPUUID(puuid, parsedQueueType);
    res.status(200).json(winrateData);
  } catch (err: any) {
    console.error('Winrate API error:', err);
    res.status(500).json({ error: 'Failed to fetch winrate data' });
  }
}
