import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@lib/prisma';

const questionGenerators = [
  leastPlayedChampion,
  mostPlayedChampion,
  mostKills,
  mostDeaths,
];

let lastQuestion: number | null = null;

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function leastPlayedChampion({ riotId}: { riotId: string}) {
  const mastery = await prisma.championMastery.findMany({
    where: { player: { riotId } },
    orderBy: { championPoints: "asc" },
    take: 4,
  });

  const correctAnswer = mastery[0];
  const options = mastery.map((m) => m.championId);

  return {
    question: `Who is ${riotId ?? "this player"}'s **least played champion**?`,
    options: options,
    answer: correctAnswer?.championId ?? "Unknown",
  };
}

async function mostPlayedChampion({ riotId}: { riotId: string}) {
  const mastery = await prisma.championMastery.findMany({
    where: { player: { riotId } },
    orderBy: { championPoints: "desc" },
    take: 4,
  });

  const correctAnswer = mastery[0];
  const options = mastery.map((m) => m.championId);

  return {
    question: `Who is ${riotId ?? "this player"}'s **most played champion**?`,
    options: options,
    answer: correctAnswer?.championId ?? "Unknown",
  };
}

async function mostKills({ riotId}: { riotId: string}) {
  const player = await prisma.player.findUnique({
    where: { riotId },
    select: {mostKills: true},
  });
  let options: number[];
  if (player !== null && player.mostKills !== null) {
    options = [player.mostKills, player.mostKills + 1, player.mostKills - 1, player.mostKills + 2];
  }
  else {
    options = [0, 0, 0, 0];
  }
  return {
    question: `How many kills did ${riotId ?? "player"} get in their **highest-kill game** recently?`,
    options: options,
    answer: player?.mostKills ?? 0,
  };
}

async function mostDeaths({ riotId}: { riotId: string }) {
  const player = await prisma.player.findUnique({
    where: { riotId },
    select: { mostDeaths: true },
  });
  let options: number[];
  if (player !== null && player.mostDeaths !== null) {
    options = [player.mostDeaths, player.mostDeaths + 1, player.mostDeaths - 1, player.mostDeaths + 2];
  }
  else {
    options = [0, 0, 0, 0];
  }

  return {
    question: `How many deaths did ${riotId ?? "player"} have in their **highest-death game** recently?`,
    options: options,
    answer: player?.mostDeaths ?? 0,
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
    });

    if (!player)
      return res.status(404).json({ error: "Player not found in DB" });
    
    let randomGen = questionGenerators[Math.floor(Math.random() * questionGenerators.length)];
    
    while(lastQuestion !== null && lastQuestion === questionGenerators.indexOf(randomGen)) {
      randomGen = questionGenerators[Math.floor(Math.random() * questionGenerators.length)];
    }

    const result = await randomGen({ riotId });
    lastQuestion = questionGenerators.indexOf(randomGen);
    
    const shuffledOptions = shuffle(result.options);

    return res.status(200).json({
      question: result.question,
      options: shuffledOptions,
      answer: result.answer,
      type: randomGen.name,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to generate question" });
  }
}
