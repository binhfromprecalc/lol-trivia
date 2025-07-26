import type { NextApiRequest, NextApiResponse } from 'next';
import { createLobby } from '../lib/lobbies';
import { nanoid } from 'nanoid';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const lobby = createLobby();
  res.status(200).json(lobby);
}

