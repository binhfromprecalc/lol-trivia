import axios from 'axios';

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const ACCOUNT_REGION = 'americas';

/**
 * Fetch account information by Riot ID.
 */
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

/** 
 * Fetch champion masteries by PUUID.
 */
export async function getChampionMasteriesByPUUID(puuid: string, platformRegion: string) {
  const res = await axios.get(
    `https://${platformRegion}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${encodeURIComponent(puuid)}`,
    { headers: { 'X-Riot-Token': RIOT_API_KEY || '' } }
  );
  const masteries = res.data;
  const champMasteries: Record<number, {championLevel: number, championPoints: number}> = {};
  for(const champion of masteries) {
    champMasteries[champion.championId] = {
      championLevel: champion.championLevel,
      championPoints: champion.championPoints
    }
  }
  return champMasteries;
}

/**
 * Fetch ranked entries by PUUID.
 */
export async function getRankedEntriesByPUUID(puuid: string, platformRegion: string) {
  const res = await axios.get(
    `https://${platformRegion}.api.riotgames.com/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`,
    { headers: { 'X-Riot-Token': RIOT_API_KEY || '' } }
  );
  return res.data;
}

/**
 * Fetch winrate data by PUUID and calculate it.
 */
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

  let wins = 0;
  let totalDeaths = 0;
  let totalKills = 0;
  let mostKills = 0;
  let mostDeaths = 0;
  const championsPlayed: Record<number, number> = {}; // championId -> count
  const championStats: Record<number, { games: number; wins: number; kills: number; deaths: number; assists: number }> = {};
  const matchStats: Record<string, {queueType: string;champId: number; kills: number; deaths: number; assists: number; win: boolean}> = {};


  for (const matchId of matchIds) {
    const matchRes = await axios.get(
      `https://${ACCOUNT_REGION}.api.riotgames.com/lol/match/v5/matches/${matchId}`,
      {
        headers: {
          'X-Riot-Token': RIOT_API_KEY || '',
        },
      }
    );

    const match = matchRes.data;
    const participant = match.info.participants.find((p: any) => p.puuid === puuid);

    if (participant) {
      const champId = participant.championId;
      const won = participant.win;
      const kills = participant.kills;
      if (kills > mostKills) mostKills = kills;
      if (participant.deaths > mostDeaths) mostDeaths = participant.deaths;
      const deaths = participant.deaths
      totalDeaths += deaths;
      totalKills += kills;
      if (won) wins++;

      championsPlayed[champId] = (championsPlayed[champId] || 0) + 1;

      if (!championStats[champId]) {
        championStats[champId] = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
      }
      championStats[champId].games++;
      if (won) championStats[champId].wins++;
      championStats[champId].kills += kills;
      championStats[champId].deaths += deaths;
      championStats[champId].assists += participant.assists;
      matchStats[matchId] = {queueType: match.info.queueId, champId, kills, deaths, assists: participant.assists, win: won };
    }
  }

  const winrate = (wins / matchIds.length) * 100;

  return {
    gamesAnalyzed: matchIds.length,
    winrate: winrate.toFixed(2),
    wins,
    totalDeaths,
    mostDeaths,
    totalKills,
    mostKills,
    losses: matchIds.length - wins,
    championsPlayed,
    championStats,
    matchStats,
  };
}
