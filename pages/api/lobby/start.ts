import type { NextApiRequest, NextApiResponse } from 'next';
import { startLobby } from '../lib/lobbies';
import { Server as SocketIOServer } from 'socket.io';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { lobbyId} = req.body;
  if (!lobbyId) {
    return res.status(400).json({ error: 'Missing lobbyId or playerName' });
  }

  const lobby = startLobby(lobbyId);

  if (!lobby) {
    return res.status(404).json({ error: 'Lobby not found' });
  }


  // Retrieve Socket.IO instance from global if initialized elsewhere
  const io: SocketIOServer | undefined = (global as any).io;
  if (io) {
    io.to(lobbyId).emit('start-game', { lobbyId });
  }
  res.status(200).json(lobby);
}
