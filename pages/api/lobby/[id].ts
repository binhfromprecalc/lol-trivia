import type { NextApiRequest, NextApiResponse } from 'next';
import { getLobby } from '@lib/lobbies';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid lobby ID' });
  }

  const lobby = getLobby(id);
  if (!lobby) {
    return res.status(404).json({ error: 'Lobby not found' });
  }

  res.status(200).json(lobby);
}
