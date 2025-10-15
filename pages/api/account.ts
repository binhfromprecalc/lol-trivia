import type { NextApiRequest, NextApiResponse } from 'next';
import { getAccountByRiotId } from '@lib/riot';
import { prisma } from "@lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { gameName, tagLine } = req.query;

  if (!gameName || typeof gameName !== 'string' || !tagLine || typeof tagLine !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid gameName or tagLine' });
  }

  try {
    const account = await getAccountByRiotId(gameName, tagLine);
    res.status(200).json({account, cached: true});
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch account data' });
  }
}