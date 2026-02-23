import axios from 'axios';

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const ACCOUNT_REGION = 'americas';
const MATCH_DETAILS_CONCURRENCY = 4;
const MATCH_DETAILS_MAX_RETRIES = 5;
const BASE_RETRY_DELAY_MS = 250;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(attempt: number) {
  const jitter = Math.floor(Math.random() * 100);
  return BASE_RETRY_DELAY_MS * (2 ** (attempt - 1)) + jitter;
}

async function fetchMatchByIdWithRetry(matchId: string) {
  let lastError: any;

  for (let attempt = 1; attempt <= MATCH_DETAILS_MAX_RETRIES; attempt++) {
    try {
      const res = await axios.get(
        `https://${ACCOUNT_REGION}.api.riotgames.com/lol/match/v5/matches/${matchId}`,
        { headers: { 'X-Riot-Token': RIOT_API_KEY || '' } }
      );
      return res.data;
    } catch (error: any) {
      lastError = error;
      if (attempt < MATCH_DETAILS_MAX_RETRIES) {
        await sleep(retryDelayMs(attempt));
      }
    }
  }

  throw lastError ?? new Error(`Failed to fetch match details for ${matchId}`);
}

async function fetchMatchesByIds(matchIds: string[]) {
  const results: any[] = new Array(matchIds.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(MATCH_DETAILS_CONCURRENCY, matchIds.length) }, async () => {
    while (true) {
      const index = cursor;
      cursor++;
      if (index >= matchIds.length) break;
      results[index] = await fetchMatchByIdWithRetry(matchIds[index]);
    }
  });

  await Promise.all(workers);
  return results;
}

export async function getAccountByRiotId(gameName: string, tagLine: string) {
  const res = await axios.get(
    `https://${ACCOUNT_REGION}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${(gameName)}/${(tagLine)}`,
    { headers: { 'X-Riot-Token': RIOT_API_KEY || '' } }
  );
  return res.data;
}

export async function getSummonerByPUUID(puuid: string) {
  const res = await axios.get(
    `https://${'na1'}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`,
    { headers: { 'X-Riot-Token': RIOT_API_KEY || '' } }
  );
  return res.data;
}

export async function getChampionMasteriesByPUUID(puuid: string, platformRegion: string) {
  const res = await axios.get(
    `https://${platformRegion}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${encodeURIComponent(puuid)}`,
    { headers: { 'X-Riot-Token': RIOT_API_KEY || '' } }
  );
  const masteries = res.data;
  const champMasteries: Record<number, {championPoints: number}> = {};
  for(const champion of masteries) {
    champMasteries[champion.championId] = {
      championPoints: champion.championPoints
    }
  }
  return champMasteries;
}

export async function getRankedEntriesByPUUID(puuid: string, platformRegion: string) {
  const res = await axios.get(
    `https://${platformRegion}.api.riotgames.com/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`,
    { headers: { 'X-Riot-Token': RIOT_API_KEY || '' } }
  );
  return res.data;
}

export async function getWinrateByPUUID(puuid: string, queueType?: number) {
  const query = new URLSearchParams({
    start: '0',
    count: '20',
  });
  if (typeof queueType === 'number') {
    query.set('queue', String(queueType));
  }

  const matchIdsRes = await axios.get(
    `https://${ACCOUNT_REGION}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?${query.toString()}`,
    {
      headers: {
        'X-Riot-Token': RIOT_API_KEY || '',
      },
    }
  );

  const matchIds: string[] = matchIdsRes.data;

  const matches = await fetchMatchesByIds(matchIds);

  let wins = 0;
  let losses = 0;
  let remakes = 0;
  let totalDeaths = 0;
  let totalKills = 0;
  let mostKills = 0;
  let mostDeaths = 0;

  const championsPlayed: Record<number, number> = {};
  const championStats: Record<number, {
    games: number;
    wins: number;
    kills: number;
    deaths: number;
    assists: number;
  }> = {};

  const matchStats: Record<string, {
    queueType: number;
    champName: string;
    kills: number;
    deaths: number;
    assists: number;
    creepScore: number;
    result: 'win' | 'loss' | 'remake';
    win: boolean;
    participantStats: Record<string, {
      riotId: string;
      champName: string;
      kills: number;
      deaths: number;
      assists: number;
      creepScore: number;
      teamId: number;
    }>;
    endGameTime: number;
  }> = {};

  let processedMatches = 0;

  matches.forEach((match, index) => {
    if (!match.info || !Array.isArray(match.info.participants)) return;

    const participant = match.info.participants.find(
      (p: any) => p.puuid === puuid
    );

    if (!participant) return;
    processedMatches++;

    const champName = participant.championName;
    const isRemake = Boolean(participant.gameEndedInEarlySurrender);
    const result: 'win' | 'loss' | 'remake' = isRemake
      ? 'remake'
      : (participant.win ? 'win' : 'loss');
    const kills = participant.kills;
    const deaths = participant.deaths;
    const creepScore = participant.totalMinionsKilled + participant.neutralMinionsKilled;

    if (kills > mostKills) mostKills = kills;
    if (deaths > mostDeaths) mostDeaths = deaths;

    totalKills += kills;
    totalDeaths += deaths;
    if (result === 'win') wins++;
    if (result === 'loss') losses++;
    if (result === 'remake') remakes++;

    championsPlayed[champName] = (championsPlayed[champName] || 0) + 1;

    if (!championStats[champName]) {
      championStats[champName] = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
    }

    championStats[champName].games++;
    if (result === 'win') championStats[champName].wins++;
    championStats[champName].kills += kills;
    championStats[champName].deaths += deaths;
    championStats[champName].assists += participant.assists;

    const participantStats: Record<string, {
      riotId: string;
      champName: string;
      kills: number;
      deaths: number;
      assists: number;
      creepScore: number;
      teamId: number;
    }> = {};
    for (const p of match.info.participants) {
      if(participantStats[p.puuid] === undefined) {
        participantStats[p.puuid] = {
          riotId: '',
          champName: '',
          kills: 0,
          deaths: 0,
          assists: 0,
          creepScore: 0,
          teamId: p.teamId,
        };
      }
      participantStats[p.puuid].riotId = p.riotIdGameName + '#' + p.riotIdTagline;
      participantStats[p.puuid].champName = p.championName;
      participantStats[p.puuid].kills = p.kills;
      participantStats[p.puuid].deaths = p.deaths;
      participantStats[p.puuid].assists = p.assists;
      participantStats[p.puuid].creepScore = p.totalMinionsKilled + p.neutralMinionsKilled;
    }

    matchStats[matchIds[index]] = {
      queueType: match.info.queueId,
      champName,
      kills,
      deaths,
      assists: participant.assists,
      creepScore,
      endGameTime: match.info.gameEndTimestamp,
      result,
      win: result === 'win',
      participantStats
    };
  });

  if (processedMatches !== matchIds.length) {
    throw new Error(`Incomplete match data: expected ${matchIds.length}, processed ${processedMatches}`);
  }

  const decidedGames = wins + losses;

  return {
    gamesAnalyzed: processedMatches,
    winrate: (decidedGames > 0 ? (wins / decidedGames) * 100 : 0).toFixed(2),
    wins,
    losses,
    remakes,
    totalKills,
    totalDeaths,
    mostKills,
    mostDeaths,
    championsPlayed,
    championStats,
    matchStats,
  };
}

