import type { NextApiRequest, NextApiResponse } from 'next';
import { getAccountByRiotId } from '@lib/riot';
import { prisma } from "@lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { gameName, tagLine } = req.query;

  if (!gameName || typeof gameName !== 'string' || !tagLine || typeof tagLine !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid gameName or tagLine' });
  }

  const riotId = `${gameName}#${tagLine}`;

  try {
    const player = await prisma.player.findUnique({
      where: { riotId },
      include: {
        championMasteries: true,
      },
    });

    if (player) {
      const now = new Date();
      const lastUpdated = new Date(player.updatedAt);
      const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

      if (hoursSinceUpdate < 24) {
        return res.status(200).json({
          cached: true,
          player,
        });
      }
    }

    const account = await getAccountByRiotId(gameName, tagLine);
    return res.status(200).json({
      cached: false,
      account,
    });
  } catch (error) {
    console.error('Error in /api/account:', error);
    return res.status(500).json({ error: 'Failed to fetch account data' });
  }
}