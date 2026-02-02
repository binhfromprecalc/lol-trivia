import axios from 'axios';

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const ACCOUNT_REGION = 'americas';

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

export async function getWinrateByPUUID(puuid: string, platformRegion: string) {
  const matchIdsRes = await axios.get(
    `https://${ACCOUNT_REGION}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=20`,
    {
      headers: {
        'X-Riot-Token': RIOT_API_KEY || '',
      },
    }
  );

  const matchIds: string[] = matchIdsRes.data;

  const matchRequests = matchIds.map(id =>
    axios.get(
      `https://${ACCOUNT_REGION}.api.riotgames.com/lol/match/v5/matches/${id}`,
      { headers: { "X-Riot-Token": RIOT_API_KEY! } }
    ).then(res => res.data)
     .catch(() => null)
  );

  const matches = await Promise.all(matchRequests);

  let wins = 0;
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
    queueType: string;
    champName: string;
    kills: number;
    deaths: number;
    assists: number;
    creepScore: number;
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
  }> = {};

  matches.forEach((match, index) => {
    if (!match) return;

    const participant = match.info.participants.find(
      (p: any) => p.puuid === puuid
    );

    if (!participant) return;

    const champName = participant.championName;
    const won = participant.win;
    const kills = participant.kills;
    const deaths = participant.deaths;
    const creepScore = participant.totalMinionsKilled + participant.neutralMinionsKilled;

    if (kills > mostKills) mostKills = kills;
    if (deaths > mostDeaths) mostDeaths = deaths;

    totalKills += kills;
    totalDeaths += deaths;
    if (won) wins++;

    championsPlayed[champName] = (championsPlayed[champName] || 0) + 1;

    if (!championStats[champName]) {
      championStats[champName] = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
    }

    championStats[champName].games++;
    if (won) championStats[champName].wins++;
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
      win: won,
      participantStats
    };
  });

  return {
    gamesAnalyzed: matchIds.length,
    winrate: ((wins / matchIds.length) * 100).toFixed(2),
    wins,
    losses: matchIds.length - wins,
    totalKills,
    totalDeaths,
    mostKills,
    mostDeaths,
    championsPlayed,
    championStats,
    matchStats,
  };
}

