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

   const player = await prisma.player.upsert({
      where: { riotId },
      update: {},
      create: {
        gameName,
        tagLine,
        riotId,
      },
    });

  try {
    const lobby = await prisma.lobby.create({
      data: {
        code: generateLobbyCode(),
        started: false,
        host: { 
          connect: { id: player.id }, 
        },
        players: {
          connect: { id: player.id },
        },
      },
      include: {
          host: true,      
          players: true,    
      },
    });
    console.log('Lobby created:', lobby);
    res.status(200).json(lobby);
  } catch (err) {
    console.error('Error creating lobby:', err);
    res.status(500).json({ error: 'Failed to create lobby' });
  }
}
