import { Server } from 'socket.io';
import type { NextApiRequest } from 'next';

const lobbies = new Map<string, Map<string, string>>();

const ioHandler = (_: NextApiRequest, res: any) => {
  if (!res.socket.server.io) {
    console.log('Initializing WebSocket server...');

    const io = new Server(res.socket.server);

    function leaveLobby(socket: any) {
      const lobbyId = socket.data.lobbyId;
      const playerName = socket.data.playerName;

      if (!lobbyId || !playerName) return;

      const lobby = lobbies.get(lobbyId);
      if (!lobby) return;

      lobby.delete(socket.id);

      socket.to(lobbyId).emit("player-left", { playerName });
      io.to(lobbyId).emit("chat-message", {
        player: "SYSTEM",
        text: `${playerName} has left the lobby.`,
        system: true,
        timestamp: Date.now(),
      });

      if (lobby.size === 0) {
        lobbies.delete(lobbyId);
      }

      delete socket.data.lobbyId;
      delete socket.data.playerName;
    }

    io.on('connection', socket => {
      console.log('Client connected:', socket.id);

      socket.on('join-lobby', ({ lobbyId, playerName }) => {
        if (socket.data.lobbyId) {
          leaveLobby(socket);
        }

        socket.data.lobbyId = lobbyId;
        socket.data.playerName = playerName;

        if (!lobbies.has(lobbyId)) {
          lobbies.set(lobbyId, new Map());
        }

        lobbies.get(lobbyId)!.set(socket.id, playerName);

        socket.join(lobbyId);

        socket.to(lobbyId).emit('player-joined', { playerName });
        io.to(lobbyId).emit('chat-message', {
          player: 'SYSTEM',
          text: `${playerName} joined the lobby`,
          system: true,
          timestamp: Date.now(),
        });
      });

      socket.on("chat-message", ({ lobbyId, text }) => {
        const player = socket.data.playerName;
        if (!player || !lobbyId) return;

        io.to(lobbyId).emit("chat-message", {
          player,
          text,
          timestamp: Date.now(),
        });
      });

      socket.on("disconnect", () => {
        leaveLobby(socket);
        console.log("Client disconnected:", socket.id);
      });

      socket.on("start-game", ({ lobbyId }) => {
        io.to(lobbyId).emit("start-game", { lobbyId });
      });

      
    });

    res.socket.server.io = io;
  }

  res.end();
};

export default ioHandler;
