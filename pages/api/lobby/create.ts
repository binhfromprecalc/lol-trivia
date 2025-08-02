import type { NextApiRequest, NextApiResponse } from 'next';
import { createLobby } from '../lib/lobbies';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { player } = req.body;
  if (!player?.name) {
    return res.status(400).json({ error: 'Missing player name for lobby host' });
  }

  const lobby = createLobby(player.name);
  res.status(200).json(lobby);
}
