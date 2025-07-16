import { useState } from 'react';
import championData from '../data/champions.json'; // adjust path if needed

const typedChampionData: Record<string, { name: string }> = championData;

export default function Home() {
  const [riotId, setRiotId] = useState('');
  const [data, setData] = useState<any>(null);
  const [masteries, setMasteries] = useState<any[]>([]);
  const [rankEntries, setRankEntries] = useState<any[]>([]);
  const [winrateData, setWinrateData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFetch = async () => {
    setLoading(true);
    setError('');
    setData(null);
    setMasteries([]);
    setRankEntries([]);
    setWinrateData(null);

    const [gameName, tagLine] = riotId.split('#');
    if (!gameName || !tagLine) {
      setError('Please enter a Riot ID in the format Name#TAG (e.g., Faker#KR)');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/summoner?gameName=${encodeURIComponent(gameName)}&tagLine=${encodeURIComponent(tagLine)}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Unknown error');
      setData(result);

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

      const platformRegion = regionMap[tagLine.toUpperCase()] || 'na1';

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

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Rito Account Lookup</h1>
      <div className="mb-2">
        <input
          className="border px-2 py-1 mr-2 w-full"
          placeholder="Enter Riot ID (e.g. Faker#KR)"
          value={riotId}
          onChange={(e) => setRiotId(e.target.value)}
        />
        <button
          className="bg-blue-500 text-white px-4 py-1 mt-2 w-full"
          onClick={handleFetch}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Search'}
        </button>
      </div>

      {error && <p className="text-red-500 mt-4">{error}</p>}

      {data && (
        <div className="mt-6 border rounded p-4">
          <h2 className="text-xl font-semibold">{data.gameName}#{data.tagLine}</h2>
          <p>PUUID: {data.puuid}</p>
        </div>
      )}

      {rankEntries.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Ranked Info</h3>
          <ul className="list-disc list-inside max-h-64 overflow-auto border rounded p-2">
            {
              rankEntries.map((entry, idx) => (
              <li key={idx}>
                {entry.queueType}: {entry.tier} {entry.rank} — {entry.leaguePoints} LP ({entry.wins}W/{entry.losses}L) — {(entry.wins/(entry.wins + entry.losses)*100).toFixed(2)}%
              </li>
            ))}
          </ul>
        </div>
      )}

      {winrateData && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">
            Winrate (Last {winrateData.gamesAnalyzed} Games)
          </h3>
          <p>
            {winrateData.winrate}% — {winrateData.wins}W / {winrateData.losses}L
          </p>
          <ul className="list-disc list-inside max-h-64 overflow-auto border rounded p-2 mt-2">
            {Object.entries(winrateData.championStats).map(([champId, stats]: any, idx) => {
              const champName = typedChampionData[champId]?.name || `Unknown (${champId})`;
              const winrate = (stats.wins/stats.games)*100;
              return (
                <li key={idx}>
                  {champName}: {stats.games} game(s), {winrate.toFixed(2)}% winrate
                </li>
              );
            })}
          </ul>
        </div>
      )}


      {masteries.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Champion Masteries</h3>
          <ul className="list-disc list-inside max-h-64 overflow-auto border rounded p-2">
            {masteries.map((m, idx) => {
              const champName = typedChampionData[String(m.championId)]?.name || `Unknown (${m.championId})`;
              return (
                <li key={idx}>
                  {champName} — Level: {m.championLevel}, Points: {m.championPoints.toLocaleString()}
                </li>
              );
            })}
          </ul>
        </div>
      )}

    </div>
  );
}
