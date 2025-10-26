import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@lib/prisma';

function generateLobbyCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const {gameName, tagLine, riotId } = req.body;
  if (!gameName || !tagLine) {
    return res.status(400).json({ error: 'Missing host player info' });
  }

  try {
    const lobby = await prisma.lobby.create({
      data: {
        code: generateLobbyCode(),
        started: false,
        players: {
          connectOrCreate: {
            where: { riotId }, 
            create: {
              gameName,
              tagLine,
              riotId,
            },
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
