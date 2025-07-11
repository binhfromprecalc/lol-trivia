import axios from 'axios';

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const REGION = 'na1';

export async function getSummonerByName(name: string) {
  const res = await axios.get(
    `https://${REGION}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${name}`,
    { headers: { 'X-Riot-Token': RIOT_API_KEY || '' } }
  );
  return res.data;
}

export async function getChampionMastery(summonerId: string) {
  const res = await axios.get(
    `https://${REGION}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-summoner/${summonerId}`,
    { headers: { 'X-Riot-Token': RIOT_API_KEY || '' } }
  );
  return res.data;
}