import { Server } from 'socket.io';
import type { NextApiRequest } from 'next';

const ioHandler = (_: NextApiRequest, res: any) => {
  if (!res.socket.server.io) {
    console.log('Initializing WebSocket server...');

    const io = new Server(res.socket.server);

    io.on('connection', socket => {
      console.log('Client connected:', socket.id);

      socket.on('join-lobby', ({ lobbyId, playerName }) => {
        socket.join(lobbyId);
        socket.to(lobbyId).emit('player-joined', { playerName });
      });

      socket.on("chat-message", ({ lobbyId, text }) => {
        io.to(lobbyId).emit("chat-message", {
          player: socket.id, 
          text,
          timestamp: Date.now(),
        });
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    res.socket.server.io = io;
  }

  res.end();
};

export default ioHandler;
