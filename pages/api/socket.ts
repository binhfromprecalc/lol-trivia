import { Server } from "socket.io";
import type { NextApiRequest } from "next";
import { prisma } from "@lib/prisma";

const PLACEHOLDER_URL = "http://localhost:3000";

interface ActiveRound {
  question: string;
  options: string[];
  answers: Map<string, number>;
  timeLeft: number;
  timer?: NodeJS.Timeout;
}

const activeGames = new Map<string, ActiveRound>();

async function startRound(io: Server, lobbyId: string) {
  const lobby = await prisma.lobby.findUnique({
    where: { id: lobbyId },
    include: { players: true },
  });

  if (!lobby || lobby.players.length === 0) return;

  const randomPlayer =
    lobby.players[Math.floor(Math.random() * lobby.players.length)];

  const res = await fetch(
    `${PLACEHOLDER_URL}/api/game/question?riotId=${encodeURIComponent(
      randomPlayer.riotId
    )}`
  );

  if (!res.ok) {
    io.to(lobbyId).emit("chat-message", {
      player: "SYSTEM",
      text: "Failed to generate question.",
      system: true,
    });
    return;
  }

  const data = await res.json();

  /**
   * Expected API response shape:
   * {
   *   question: string,
   *   options: string[],
   *   correctIndex: number,
   *   duration?: number
   * }
   */

  const round: ActiveRound = {
    question: data.question,
    options: data.options,
    answers: new Map(),
    timeLeft: 15,
  };

  activeGames.set(lobbyId, round);

  io.to(lobbyId).emit("new-question", {
    question: round.question,
    options: round.options,
    duration: round.timeLeft,
  });

  round.timer = setInterval(() => {
    round.timeLeft--;
    io.to(lobbyId).emit("timer", { timeLeft: round.timeLeft });

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
    counts[ans]++;
  }

  io.to(lobbyId).emit("answer-results", {
    counts,
  });
  setTimeout(() => startRound(io, lobbyId), 4000);
}




const ioHandler = (_: NextApiRequest, res: any) => {
  if (!res.socket.server.io) {
    console.log("Initializing WebSocket server...");

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

        io.to(lobbyId).emit("lobby-state", { lobby });

        io.to(lobbyId).emit("chat-message", {
          player: "SYSTEM",
          text: `${playerName} has left the lobby.`,
          system: true,
          timestamp: Date.now(),
        });

        socket.leave(lobbyId);
        delete socket.data.lobbyId;
        delete socket.data.playerName;
      } catch (err) {
        console.error("Error leaving lobby:", err);
      }
    }

    io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);

      socket.on("join-lobby", async ({ lobbyId, playerName }) => {
        try {
          socket.join(lobbyId);
          socket.data.lobbyId = lobbyId;
          socket.data.playerName = playerName;

          const player = await prisma.player.findUnique({
            where: { riotId: playerName },
          });

          if (player) {
            await prisma.player.update({
              where: { id: player.id },
              data: { lobbyId },
            });
          }

          const lobby = await prisma.lobby.findUnique({
            where: { id: lobbyId },
            include: { host: true, players: true },
          });

          io.to(lobbyId).emit("lobby-state", { lobby });
        } catch (err) {
          console.error("Error joining lobby:", err);
        }
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
        console.log("Client disconnected:", socket.id);
        leaveLobby(socket);
      });

      socket.on("start-game", async ({ lobbyId }) => {
        const lobby = await prisma.lobby.findUnique({
          where: { id: lobbyId },
          include: { players: true },
        });

        if (!lobby) return;
        console.log(`Starting game for lobby ${lobbyId}`);

        try {
          await Promise.all(
            lobby.players.map(async (player) => {
              const [gameName, tagLine] = [
                player.gameName,
                player.tagLine,
              ];
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
                `${PLACEHOLDER_URL}/api/winrate?puuid=${encodeURIComponent(account.puuid)}&platformRegion=${tagLine}`
              );
              const winrateResult = await winrateRes.json();

              await fetch(`${PLACEHOLDER_URL}/api/sync`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  account,
                  summoner: profileResult,
                  rankedEntries: rankResult,
                  masteries: masteriesResult,
                  winrate: winrateResult,
                  gameName,
                  tagLine,
                  region: "na1",
                }),
              });
            })
          );
          console.log("All players synced successfully!");
          io.to(lobbyId).emit("start-game", { lobbyId });
        } catch (err) {
          console.error("Error syncing players:", err);
          io.to(lobbyId).emit("chat-message", {
            player: "SYSTEM",
            text: "Error syncing player data. Please try again.",
            system: true,
            timestamp: Date.now(),
          });
        }
      });
        socket.on("submit-answer", ({ lobbyId, answerIndex }) => {
        const round = activeGames.get(lobbyId);
        const player = socket.data.playerName;
        if (!round || !player) return;

        if (round.answers.has(player)) return;

        round.answers.set(player, answerIndex);

        prisma.lobby
          .findUnique({ where: { id: lobbyId }, include: { players: true } })
          .then((lobby) => {
            if (!lobby) return;
            if (round.answers.size >= lobby.players.length) {
              endRound(io, lobbyId);
            }
          });
        });
  });
    res.socket.server.io = io;
  }

  res.end();
};

export default ioHandler;
