import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../lib/prisma';

function generateLobbyCode(length = 6) {
  return Math.random().toString(36).substr(2, length).toUpperCase();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const {host } = req.body;
  if (!host?.gameName || !host?.tagLine || !host?.riotId) {
    return res.status(400).json({ error: 'Missing host player info' });
  }

  try {
    const lobby = await prisma.lobby.create({
      data: {
        code: generateLobbyCode(),
        started: false,
        players: {
          create: {
            gameName: host.gameName,
            tagLine: host.tagLine,
            riotId: host.riotId,
          },
        },
      },
      include: {
        players: true,
      },
    });

    res.status(200).json(lobby);
  } catch (err) {
    console.error('Error creating lobby:', err);
    res.status(500).json({ error: 'Failed to create lobby' });
  }
}
