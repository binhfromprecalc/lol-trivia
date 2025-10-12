import type { NextApiRequest, NextApiResponse } from 'next';
import { getSummonerByPUUID } from '@lib/riot';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const {puuid } = req.query;

  if (!puuid || typeof puuid !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid puuid' });
  }

  try {
    const account = await getSummonerByPUUID(puuid);
    res.status(200).json(account);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch account data' });
  }
}