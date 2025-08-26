import type { NextApiRequest, NextApiResponse } from 'next';
import { joinLobby } from '../lib/lobbies';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { lobbyId, player } = req.body;
  console.log(lobbyId, player);

  if (!lobbyId || !player) {
    return res.status(400).json({ error: 'Missing lobbyId or player data' });
  }

  const updatedLobby = joinLobby(lobbyId, player);
  if (!updatedLobby) {
    return res.status(404).json({ error: 'Lobby not found' });
  }

  res.status(200).json(updatedLobby);
}