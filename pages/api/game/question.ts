import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@lib/prisma';
import championData from '@data/champions.json';

type QuestionResult = {
  question: string;
  options: (string | number)[];
  answer: string | number;
};

type LobbyPlayer = {
  riotId: string;
  gameName: string;
  mostKills: number | null;
};

type QuestionGenerator = (args: {
  riotId: string;
  lobbyPlayers: LobbyPlayer[];
}) => Promise<QuestionResult>;

type QuestionDefinition = {
  id: string;
  generate: QuestionGenerator;
};

const questions: QuestionDefinition[] = [
  { id: 'leastPlayedChampion', generate: leastPlayedChampion },
  { id: 'mostPlayedChampion', generate: mostPlayedChampion },
  { id: 'mostKills', generate: mostKills },
  { id: 'mostDeaths', generate: mostDeaths },
  { id: 'randomChampionMastery', generate: randomChampionMastery },
  { id: 'highestKillsInLobby', generate: highestKillsInLobby },
];

const typedChampionData: Record<string, { name: string }> = championData;

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function leastPlayedChampion({ riotId }: { riotId: string }): Promise<QuestionResult> {
  const mastery = await prisma.championMastery.findMany({
    where: { player: { riotId } },
    orderBy: { championPoints: 'asc' },
    take: 4,
  });

  const correctAnswer = typedChampionData[mastery[0]?.championId ?? 0];
  const options = mastery.map((m) => typedChampionData[m.championId]?.name ?? 'Unknown');

  return {
    question: `Who is ${riotId ?? 'this player'}'s least played champion?`,
    options,
    answer: correctAnswer?.name ?? 'Unknown',
  };
}

async function randomChampionMastery({ riotId }: { riotId: string }): Promise<QuestionResult> {
  const count = await prisma.championMastery.count({
    where: { player: { riotId } },
  });

  const randomNum = Math.floor(Math.random() * Math.max(count, 1));
  const mastery = await prisma.championMastery.findMany({
    where: { player: { riotId } },
    skip: randomNum,
    take: 1,
  });

  return {
    question: `Which player has ${mastery[0]?.championPoints ?? 0} mastery points on ${typedChampionData[mastery[0]?.championId ?? 0]?.name ?? 'Unknown'}?`,
    options: [] as (string | number)[],
    answer: riotId,
  };
}

async function mostPlayedChampion({ riotId }: { riotId: string }): Promise<QuestionResult> {
  const mastery = await prisma.championMastery.findMany({
    where: { player: { riotId } },
    orderBy: { championPoints: 'desc' },
    take: 4,
  });

  const correctAnswer = typedChampionData[mastery[0]?.championId ?? 0];
  const options = mastery.map((m) => typedChampionData[m.championId]?.name ?? 'Unknown');

  return {
    question: `Who is ${riotId ?? 'this player'}'s most played champion?`,
    options,
    answer: correctAnswer?.name ?? 'Unknown',
  };
}

async function mostKills({ riotId }: { riotId: string }): Promise<QuestionResult> {
  const player = await prisma.player.findUnique({
    where: { riotId },
    select: { mostKills: true },
  });

  let options: number[];
  if (player !== null && player.mostKills !== null) {
    options = [player.mostKills, player.mostKills + 1, player.mostKills - 1, player.mostKills + 2];
  } else {
    options = [0, 0, 0, 0];
  }

  return {
    question: `How many kills did ${riotId ?? 'player'} get in their highest-kill game recently?`,
    options,
    answer: player?.mostKills ?? 0,
  };
}

async function mostDeaths({ riotId }: { riotId: string }): Promise<QuestionResult> {
  const player = await prisma.player.findUnique({
    where: { riotId },
    select: { mostDeaths: true },
  });

  let options: number[];
  if (player !== null && player.mostDeaths !== null) {
    options = [player.mostDeaths, player.mostDeaths + 1, player.mostDeaths - 1, player.mostDeaths + 2];
  } else {
    options = [0, 0, 0, 0];
  }

  return {
    question: `How many deaths did ${riotId ?? 'player'} have in their highest-death game recently?`,
    options,
    answer: player?.mostDeaths ?? 0,
  };
}

async function highestKillsInLobby({ riotId, lobbyPlayers }: { riotId: string; lobbyPlayers: LobbyPlayer[] }): Promise<QuestionResult> {
  const eligible = lobbyPlayers.filter((p) => p.mostKills !== null);
  const source = eligible.length > 0 ? eligible : lobbyPlayers;

  if (source.length === 0) {
    return {
      question: 'Who in this lobby has the highest recorded kills in a game?',
      options: [riotId],
      answer: riotId,
    };
  }

  const sorted = [...source].sort((a, b) => (b.mostKills ?? 0) - (a.mostKills ?? 0));
  const answer = sorted[0]?.riotId ?? riotId;

  return {
    question: 'Who in this lobby has the highest recorded kills in a game?',
    options: [] as (string | number)[],
    answer,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  try {
    const { lobbyId, excludedTypes } = req.body as {
      lobbyId?: string;
      excludedTypes?: string[];
    };

    if (!lobbyId) {
      return res.status(400).json({ error: 'Missing lobbyId' });
    }

    const lobby = await prisma.lobby.findUnique({
      where: { id: lobbyId },
      include: {
        players: {
          select: {
            riotId: true,
            gameName: true,
            mostKills: true,
          },
        },
      },
    });

    if (!lobby || lobby.players.length === 0) {
      return res.status(404).json({ error: 'Lobby not found or has no players' });
    }

    const randomPlayer = lobby.players[Math.floor(Math.random() * lobby.players.length)];
    const excludedSet = new Set(Array.isArray(excludedTypes) ? excludedTypes : []);
    const availableQuestions = questions.filter((q) => !excludedSet.has(q.id));

    if (availableQuestions.length === 0) {
      return res.status(409).json({ error: 'No new questions available for this lobby' });
    }

    const randomQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
    const result = await randomQuestion.generate({
      riotId: randomPlayer.riotId,
      lobbyPlayers: lobby.players,
    });

    return res.status(200).json({
      question: result.question,
      options: shuffle(result.options),
      answer: result.answer,
      type: randomQuestion.id,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to generate question' });
  }
}
