import { Server } from "socket.io";
import type { NextApiRequest } from "next";
import { prisma } from "@lib/prisma";

const PLACEHOLDER_URL = "http://localhost:3000";

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
    });

    res.socket.server.io = io;
  }

  res.end();
};

export default ioHandler;
