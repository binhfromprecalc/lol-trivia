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

export async function getChampionMasteriesByPUUID(puuid: string, platformRegion: string) {
  const res = await axios.get(
    `https://${platformRegion}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${encodeURIComponent(puuid)}`,
    { headers: { 'X-Riot-Token': RIOT_API_KEY || '' } }
  );
  return res.data;
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

  let wins = 0;
  const championsPlayed: Record<number, number> = {}; // championId -> count
  const championStats: Record<number, { games: number; wins: number }> = {};

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

      if (won) wins++;

      championsPlayed[champId] = (championsPlayed[champId] || 0) + 1;

      if (!championStats[champId]) {
        championStats[champId] = { games: 0, wins: 0 };
      }
      championStats[champId].games++;
      if (won) championStats[champId].wins++;
    }
  }

  const winrate = (wins / matchIds.length) * 100;

  return {
    gamesAnalyzed: matchIds.length,
    winrate: winrate.toFixed(2),
    wins,
    losses: matchIds.length - wins,
    championsPlayed,
    championStats,
  };
}
