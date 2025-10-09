import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { lobbyCode, gameName, tagLine, riotId } = req.body;
  if (!lobbyCode || !gameName || !tagLine || !riotId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const lobby = await prisma.lobby.findUnique({
      where: { code: lobbyCode },
    });

    if (!lobby) return res.status(404).json({ error: 'Lobby not found' });

    const player = await prisma.player.create({
      data: {
        gameName,
        tagLine,
        riotId,
        lobbyId: lobby.id,
      },
    });

    res.status(200).json(player);
  } catch (err) {
    console.error('Error joining lobby:', err);
    res.status(500).json({ error: 'Failed to join lobby' });
  }
}
