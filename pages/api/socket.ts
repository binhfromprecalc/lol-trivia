import { Server } from 'socket.io';
import type { NextApiRequest } from 'next';
import { prisma } from '@lib/prisma';

const PLACEHOLDER_URL = 'http://localhost:3000';
const MAX_QUESTIONS_PER_LOBBY = 6;

interface ActiveRound {
  question: string;
  options: (string | number)[];
  answer: string | number;
  answers: Map<string, { index: number; text?: string }>;
  timeLeft: number;
  timer?: NodeJS.Timeout;
}

interface LobbyQuestionProgress {
  askedTypes: Set<string>;
  roundsAsked: number;
  maxRounds: number;
}

const activeGames = new Map<string, ActiveRound>();
const lobbyQuestionProgress = new Map<string, LobbyQuestionProgress>();

function clearActiveRound(lobbyId: string) {
  const activeRound = activeGames.get(lobbyId);
  if (activeRound?.timer) {
    clearInterval(activeRound.timer);
  }
  activeGames.delete(lobbyId);
}

function endLobbyGame(io: Server, lobbyId: string, message: string) {
  clearActiveRound(lobbyId);
  lobbyQuestionProgress.delete(lobbyId);

  io.to(lobbyId).emit('game-over', { message });
  io.to(lobbyId).emit('chat-message', {
    player: 'SYSTEM',
    text: message,
    system: true,
    timestamp: Date.now(),
  });
}

async function startRound(io: Server, lobbyId: string) {
  const lobby = await prisma.lobby.findUnique({
    where: { id: lobbyId },
    include: { players: true },
  });

  if (!lobby || lobby.players.length === 0) {
    endLobbyGame(io, lobbyId, 'Game ended because the lobby is empty.');
    return;
  }

  const progress = lobbyQuestionProgress.get(lobbyId);
  if (!progress) {
    endLobbyGame(io, lobbyId, 'Game ended because lobby question state was not initialized.');
    return;
  }

  if (progress.roundsAsked >= progress.maxRounds) {
    endLobbyGame(io, lobbyId, 'Question set complete. Game over.');
    return;
  }

  const res = await fetch(`${PLACEHOLDER_URL}/api/game/question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lobbyId,
      excludedTypes: Array.from(progress.askedTypes),
    }),
  });

  if (res.status === 409) {
    endLobbyGame(io, lobbyId, 'No more unique questions are available for this lobby.');
    return;
  }

  if (!res.ok) {
    io.to(lobbyId).emit('chat-message', {
      player: 'SYSTEM',
      text: 'Failed to generate question.',
      system: true,
      timestamp: Date.now(),
    });
    return;
  }

  const data = await res.json();

  if (typeof data.type === 'string') {
    progress.askedTypes.add(data.type);
  }
  progress.roundsAsked += 1;

  const round: ActiveRound = {
    question: data.question,
    options: Array.isArray(data.options) ? data.options : [],
    answer: data.answer,
    answers: new Map(),
    timeLeft: 15,
  };

  activeGames.set(lobbyId, round);

  io.to(lobbyId).emit('new-question', {
    question: round.question,
    options: round.options,
    duration: round.timeLeft,
  });

  round.timer = setInterval(() => {
    round.timeLeft -= 1;
    io.to(lobbyId).emit('timer', { timeLeft: round.timeLeft });

    if (round.timeLeft <= 0) {
      endRound(io, lobbyId);
    }
  }, 1000);
}

function endRound(io: Server, lobbyId: string) {
  const round = activeGames.get(lobbyId);
  if (!round) return;

  if (round.timer) clearInterval(round.timer);

  const counts = Array(round.options.length).fill(0);
  for (const ans of round.answers.values()) {
    if (ans.index >= 0 && ans.index < counts.length) {
      counts[ans.index] += 1;
    }
  }

  io.to(lobbyId).emit('answer-results', {
    answer: round.answer,
    counts,
  });

  activeGames.delete(lobbyId);

  const progress = lobbyQuestionProgress.get(lobbyId);
  if (progress && progress.roundsAsked >= progress.maxRounds) {
    endLobbyGame(io, lobbyId, 'Question set complete. Game over.');
    return;
  }

  setTimeout(() => startRound(io, lobbyId), 2000);
}

const ioHandler = (_: NextApiRequest, res: any) => {
  if (!res.socket.server.io) {
    console.log('Initializing WebSocket server...');

    const io = new Server(res.socket.server);

    async function leaveLobby(socket: any) {
      const { lobbyId, playerName } = socket.data;
      if (!lobbyId || !playerName) return;

      try {
        const player = await prisma.player.findUnique({
          where: { riotId: playerName },
        });

        if (player) {
          await prisma.player.update({
            where: { id: player.id },
            data: { lobbyId: null },
          });
        }

        const lobby = await prisma.lobby.findUnique({
          where: { id: lobbyId },
          include: { host: true, players: true },
        });

        io.to(lobbyId).emit('lobby-state', { lobby });

        io.to(lobbyId).emit('chat-message', {
          player: 'SYSTEM',
          text: `${playerName} has left the lobby.`,
          system: true,
          timestamp: Date.now(),
        });

        if (!lobby || lobby.players.length === 0) {
          clearActiveRound(lobbyId);
          lobbyQuestionProgress.delete(lobbyId);
        }

        socket.leave(lobbyId);
        delete socket.data.lobbyId;
        delete socket.data.playerName;
      } catch (err) {
        console.error('Error leaving lobby:', err);
      }
    }

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      socket.on('join-lobby', async ({ lobbyId, playerName }) => {
        if (!lobbyId || !playerName) return;

        socket.join(lobbyId);
        socket.data.lobbyId = lobbyId;

        const player = await prisma.player.findUnique({
          where: { riotId: playerName },
        });

        if (!player) return;

        socket.data.playerId = player.id;
        socket.data.playerName = player.riotId;

        await prisma.player.update({
          where: { id: player.id },
          data: { lobbyId },
        });

        const lobby = await prisma.lobby.findUnique({
          where: { id: lobbyId },
          include: { host: true, players: true },
        });

        io.to(lobbyId).emit('lobby-state', { lobby });

        io.to(lobbyId).emit('chat-message', {
          player: 'SYSTEM',
          text: `${player.riotId} has joined the lobby.`,
          system: true,
          timestamp: Date.now(),
        });
      });

      socket.on('chat-message', ({ lobbyId, text }) => {
        if (!text?.trim()) return;

        io.to(lobbyId).emit('chat-message', {
          player: socket.data.playerName ?? 'Unknown',
          text: text.slice(0, 300),
          timestamp: Date.now(),
        });
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        leaveLobby(socket);
      });

      socket.on('start-game', async ({ lobbyId }) => {
        const lobby = await prisma.lobby.findUnique({
          where: { id: lobbyId },
          include: { players: true },
        });

        if (!lobby) return;
        console.log(`Starting game for lobby ${lobbyId}`);

        try {
          await Promise.all(
            lobby.players.map(async (player) => {
              const [gameName, tagLine] = [player.gameName, player.tagLine];
              const acc = await fetch(`${PLACEHOLDER_URL}/api/account?gameName=${gameName}&tagLine=${tagLine}`);
              const account = await acc.json();
              const profileRes = await fetch(
                `${PLACEHOLDER_URL}/api/summoner?puuid=${encodeURIComponent(account.puuid)}`
              );
              const profileResult = await profileRes.json();
              const masteriesRes = await fetch(
                `${PLACEHOLDER_URL}/api/masteries?puuid=${encodeURIComponent(account.puuid)}&platformRegion=${tagLine}`
              );
              const masteriesResult = await masteriesRes.json();
              const rankRes = await fetch(
                `${PLACEHOLDER_URL}/api/rank?puuid=${encodeURIComponent(account.puuid)}&platformRegion=${tagLine}`
              );
              const rankResult = await rankRes.json();
              const winrateRes = await fetch(
                `${PLACEHOLDER_URL}/api/winrate?puuid=${encodeURIComponent(account.puuid)}`
              );
              const winrateResult = await winrateRes.json();

              await fetch(`${PLACEHOLDER_URL}/api/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  account,
                  summoner: profileResult,
                  rankedEntries: rankResult,
                  masteries: masteriesResult,
                  winrate: winrateResult,
                  gameName,
                  tagLine,
                  region: 'na1',
                }),
              });
            })
          );

          clearActiveRound(lobbyId);
          lobbyQuestionProgress.set(lobbyId, {
            askedTypes: new Set<string>(),
            roundsAsked: 0,
            maxRounds: MAX_QUESTIONS_PER_LOBBY,
          });

          console.log('All players synced successfully!');
          io.to(lobbyId).emit('start-game', { lobbyId });
          startRound(io, lobbyId);
        } catch (err) {
          console.error('Error syncing players:', err);
          io.to(lobbyId).emit('chat-message', {
            player: 'SYSTEM',
            text: 'Error syncing player data. Please try again.',
            system: true,
            timestamp: Date.now(),
          });
        }
      });

      socket.on('submit-answer', async ({ lobbyId, answerIndex, answerText }) => {
        const round = activeGames.get(lobbyId);
        if (!round) return;

        const playerKey = socket.id;

        if (round.answers.has(playerKey)) return;

        round.answers.set(playerKey, {
          index: typeof answerIndex === 'number' ? answerIndex : -1,
          text: typeof answerText === 'string' ? answerText.slice(0, 300) : undefined,
        });

        const sockets = await io.in(lobbyId).fetchSockets();
        const expectedPlayers = sockets.length;

        if (round.answers.size >= expectedPlayers) {
          endRound(io, lobbyId);
        }
      });
    });

    res.socket.server.io = io;
  }

  res.end();
};

export default ioHandler;
