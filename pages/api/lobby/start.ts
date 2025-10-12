import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { id } = req.query; 

  try {
    const lobby = await prisma.lobby.findUnique({
      where: { id: String(id) },
      include: { players: true },
    });

    if (!lobby) {
      return res.status(404).json({ error: "Lobby not found" });
    }

    for (const player of lobby.players) {
      await fetch(`/api/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameName: player.gameName,
          tagLine: player.tagLine,
        }),
      });
    }

    await prisma.lobby.update({
      where: { id: String(id) },
      data: { started: true },
    });

    return res.status(200).json({ message: "Lobby started and all players synced" });
  } catch (err) {
    console.error("Error starting lobby:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
