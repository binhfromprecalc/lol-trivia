import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import championData from '../data/champions.json'; 
const typedChampionData: Record<string, { name: string }> = championData;
export default function RiotProfilePage() {
  const router = useRouter();
  console.log('Router:', router.query);
  const { riotId } = router.query;
  const [data, setData] = useState<any>(null);
  const [profile,setProfile] = useState<any>(null);
  const [gameName, setGameName] = useState('');
  const [tagLine, setTagLine] = useState('');
  const [masteries, setMasteries] = useState<any[]>([]);
  const [rankEntries, setRankEntries] = useState<any[]>([]);
  const [winrateData, setWinrateData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const specialCases: Record<string, string>= {
      "Wukong": "MonkeyKing",
      "Nunu & Willump": "Nunu",
      "Cho'Gath": "Chogath",
      "Kha'Zix": "Khazix",
      "Vel'Koz": "Velkoz",
      "Jarvan IV": "JarvanIV",
      "Dr. Mundo": "DrMundo",
      "Rek'Sai": "RekSai",
      "Bel'Veth": "Belveth",
      "Renata Glasc": "Renata",
      "Kai'Sa": "Kaisa",
      "LeBlanc": "Leblanc",
  };

  useEffect(() => {
  if (!router.isReady || typeof riotId !== 'string') return;

  const [name, tag] = riotId.split('-');
  if (!name || !tag) {
    setError('Riot ID must be in the format Name-Tag (e.g. Faker-KR)');
    return;
  }

  const fetchData = async () => {
    setLoading(true);
    setError('');
    setData(null);
    setMasteries([]);
    setRankEntries([]);
    setWinrateData(null);

    try {
      console.log('Parsed Riot ID:', { name, tag });
      const res = await fetch(`/api/account?gameName=${name}&tagLine=${tag}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Unknown error');
      setData(result);
      setGameName(name);
      setTagLine(tag);

      const regionMap: Record<string, string> = {
        NA1: 'na1',
        EUW1: 'euw1',
        KR: 'kr',
        EUN1: 'eun1',
        JP1: 'jp1',
        BR1: 'br1',
        OC1: 'oc1',
        RU: 'ru',
        TR1: 'tr1',
        LA1: 'la1',
        LA2: 'la2',
      };

      const platformRegion = regionMap[tag.toUpperCase()] || 'na1';

      const profileRes = await fetch(`/api/summoner?puuid=${encodeURIComponent(result.puuid)}`);
      const profileResult = await profileRes.json();
      if (!profileRes.ok) throw new Error(profileResult.error || 'Error fetching icon');
      setProfile(profileResult);

      const masteryRes = await fetch(`/api/masteries?puuid=${encodeURIComponent(result.puuid)}&platformRegion=${platformRegion}`);
      const masteryResult = await masteryRes.json();
      if (!masteryRes.ok) throw new Error(masteryResult.error || 'Error fetching masteries');
      setMasteries(masteryResult);

      const rankRes = await fetch(`/api/rank?puuid=${encodeURIComponent(result.puuid)}&platformRegion=${platformRegion}`);
      const rankResult = await rankRes.json();
      if (!rankRes.ok) throw new Error(rankResult.error || 'Error fetching rank info');
      setRankEntries(rankResult);

      const winrateRes = await fetch(`/api/winrate?puuid=${encodeURIComponent(result.puuid)}&platformRegion=${platformRegion}`);
      const winrateResult = await winrateRes.json();
      if (!winrateRes.ok) throw new Error(winrateResult.error || 'Error fetching winrate');
      setWinrateData(winrateResult);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, [router.isReady, riotId]);



  return (
    <div style={{ justifyContent: 'center' }}>
      <h1>Riot Profile for {gameName}#{tagLine}</h1>

      {data && profile && (
        <div className="mt-6 rounded p-4 bg-gray-100">
          <img
            src={`https://ddragon.leagueoflegends.com/cdn/15.15.1/img/profileicon/${profile.profileIconId}.png`}
            alt={`${gameName} Profile Icon`}
            className="w-24 h-24 rounded-full mb-2">
          </img>
          <h2 className="text-xl font-semibold">{data.gameName} - level {profile.summonerLevel} </h2>
        </div>
      )}

      {/* Ranked Info */}
      {rankEntries.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Ranked Info</h3>
          <ul className="list-disc list-inside max-h-64 overflow-auto rounded p-2">
            {rankEntries.map((entry, idx) => (
              <li key={idx}>
                {entry.queueType}: {entry.tier} {entry.rank} — {entry.leaguePoints} LP ({entry.wins}W/{entry.losses}L) — {(entry.wins / (entry.wins + entry.losses) * 100).toFixed(2)}%
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Winrate */}
      {winrateData && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">
            Winrate (Last {winrateData.gamesAnalyzed} Games)
          </h3>
          <p>
            {winrateData.winrate}% — {winrateData.wins}W / {winrateData.losses}L
          </p>
          <p>Total Kills: {winrateData.totalKills}  </p>
          <p>Total Deaths: {winrateData.totalDeaths}</p>
          <p>Most Kills in a Game: {winrateData.mostKills}</p>
          <p>Most Deaths in a Game: {winrateData.mostDeaths}</p>
          <ul className="list-disc list-inside max-h-64 overflow-auto rounded p-2 mt-2">
            {Object.entries(winrateData.championStats).map(([champId, stats]: any, idx) => {
              const champName = typedChampionData[champId]?.name || `Unknown (${champId})`;
              const winrate = (stats.wins / stats.games) * 100;
              const kda = stats.deaths > 0 ? ((stats.kills + stats.assists) / stats.deaths).toFixed(2) : ((stats.kills + stats.assists) / 1).toFixed(2);
              return (
                <li key={idx}>
                  {champName}: {stats.games} game(s), {winrate.toFixed(2)}% winrate, KDA: {kda}
                </li>
              );
            })}
          </ul>
        </div>
      )}

        {/* Masteries */}
        {masteries && Object.keys(masteries).length > 0 && (() => {
        // Inline IIFE to calculate lowest mastery inside JSX
          const entries = Object.entries(masteries);
          const [lowestChampId, lowestData] = entries.reduce(
          (minEntry, currEntry) =>
            currEntry[1].championPoints < minEntry[1].championPoints ? currEntry : minEntry
        );

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-2">Champion Masteries</h3>

      {/*Lowest Mastery Callout */}
      <div className="mb-3 p-3 bg-yellow-100 rounded text-sm">
        🐢 <strong>Lowest Mastery Champion:</strong>{' '}
        {typedChampionData[lowestChampId]?.name || `Unknown (${lowestChampId})`} —{' '}
        {lowestData.championPoints.toLocaleString()} points
      </div>

      <ul className="list-none max-h-64 overflow-auto rounded p-2">
          {entries
            .sort(([, a], [, b]) => b.championPoints - a.championPoints)
            .map(([champId, data], idx) => {
              const champName = typedChampionData[champId]?.name || `Unknown (${champId})`;

      // Use your specialCases/sanitize logic here
        const specialCases: Record<string,string> = {
          "Wukong": "MonkeyKing",
          "Nunu & Willump": "Nunu",
          "Cho'Gath": "Chogath",
          "Kha'Zix": "Khazix",
          "Vel'Koz": "Velkoz",
          "Jarvan IV": "JarvanIV",
          "Dr. Mundo": "DrMundo",
          "Rek'Sai": "RekSai",
          "Bel'Veth": "Belveth",
          "Renata Glasc": "Renata",
          "Kai'Sa": "Kaisa",
          "LeBlanc": "Leblanc",
        };
        const sanitizedChampName = specialCases[champName] || champName.replace(/\s/g, '').replace(/[^a-zA-Z]/g, '');

        return (
          <li key={idx} className="flex items-center">
            <img
              src={`/img/champions/${sanitizedChampName}.png`}
              alt={champName}
              width={48}
              height ={48}
              style={{ marginRight: 8 }}
            />
            <span>
              {champName} — Level: {data.championLevel}, Points: {data.championPoints.toLocaleString()}
            </span>
          </li>
        );
      })}
    </ul>

    </div>
  );
  })()}
  </div>
  );
}
