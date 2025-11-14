import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@lib/prisma';

const questionGenerators = [
  leastPlayedChampion,
  mostPlayedChampion,
  mostKills,
  mostDeaths,
];

async function leastPlayedChampion({ riotId, id }: { riotId: string; id: string }) {
  const mastery = await prisma.championMastery.findMany({
    where: { id },
    orderBy: { championPoints: "asc" },
    take: 1,
  });

  const champ = mastery[0];

  return {
    question: `Who is ${riotId ?? "this player"}'s **least played champion**?`,
    answer: champ?.championId ?? "Unknown",
  };
}

async function mostPlayedChampion({ riotId, id }: { riotId: string; id: string }) {
  const mastery = await prisma.championMastery.findMany({
    where: { id },
    orderBy: { championPoints: "desc" },
    take: 1,
  });

  const champ = mastery[0];

  return {
    question: `Who is ${riotId ?? "this player"}'s **most played champion**?`,
    answer: champ?.championId ?? "Unknown",
  };
}

async function mostKills({ riotId, id }: { riotId: string; id: string }) {
  const player = await prisma.player.findUnique({
    where: { id },
    select: {mostKills: true},
  });

  return {
    question: `How many kills did ${riotId ?? "player"} get in their **highest-kill game** recently?`,
    answer: `${player?.mostKills ?? "N/A"} kills`,
  };
}

async function mostDeaths({ riotId,id }: {riotId: string; id: string }) {
  const player = await prisma.player.findUnique({
    where: { id },
    select: { mostDeaths: true },
  });

  return {
    question: `How many deaths did ${riotId ?? "player"} have in their **highest-death game** recently?`,
    answer: `${player?.mostDeaths ?? "N/A"} deaths`,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "POST only" });

  try {
    const { riotId } = req.body;

    if (!riotId)
      return res.status(400).json({ error: "Missing riotId" });

    const player = await prisma.player.findUnique({
      where: { riotId },
      select: { id: true },
    });

    if (!player)
      return res.status(404).json({ error: "Player not found in DB" });

    const { id } = player;

    const randomGen =
      questionGenerators[Math.floor(Math.random() * questionGenerators.length)];

    const result = await randomGen({ riotId, id });

    return res.status(200).json({
      question: result.question,
      answer: result.answer,
      type: randomGen.name,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to generate question" });
  }
}