import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { lobbyCode, gameName, tagLine, riotId } = req.body;
  if (!lobbyCode || !gameName || !tagLine || !riotId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const lobby = await prisma.lobby.findUnique({ where: { code: lobbyCode } });
    if (!lobby) return res.status(404).json({ error: "Lobby not found" });

    let player = await prisma.player.findUnique({ where: { riotId } });

    if (!player) {
      player = await prisma.player.create({
        data: {
          gameName,
          tagLine,
          riotId,
          lobby: { connect: { id: lobbyCode } },
        },
      });
    } else {
      player = await prisma.player.update({
        where: { riotId },
        data: { lobbyId: lobby.id },
      });
    }

    const updatedLobby = await prisma.lobby.findUnique({
      where: { id: lobby.id },
      include: {
        host: true,
        players: true,
      },
    });

    return res.status(200).json(updatedLobby);
  } catch (err) {
    console.error('Error joining lobby:', err);
    res.status(500).json({ error: 'Failed to join lobby' });
  }
}
