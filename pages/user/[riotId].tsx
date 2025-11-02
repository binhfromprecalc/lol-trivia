import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import championData from '@data/champions.json';
import '@styles/riotId.css'; 

const typedChampionData: Record<string, { name: string }> = championData;

export default function RiotProfilePage() {
  const router = useRouter();
  const { riotId } = router.query;
  const [data, setData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [gameName, setGameName] = useState('');
  const [tagLine, setTagLine] = useState('');
  const [masteries, setMasteries] = useState<any[]>([]);
  const [rankEntries, setRankEntries] = useState<any[]>([]);
  const [winrateData, setWinrateData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const specialCases: Record<string, string> = {
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
        const res = await fetch(`/api/account?gameName=${name}&tagLine=${tag}`);
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Unknown error');
        setData(result);
        setGameName(name);
        setTagLine(tag);

        const regionMap: Record<string, string> = {
          NA1: 'na1', EUW1: 'euw1', KR: 'kr', EUN1: 'eun1',
          JP1: 'jp1', BR1: 'br1', OC1: 'oc1', RU: 'ru',
          TR1: 'tr1', LA1: 'la1', LA2: 'la2',
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

        await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            account: result,
            summoner: profileResult,
            rankedEntries: rankResult,
            masteries: masteryResult,
            winrate: winrateResult,
            gameName: name,
            tagLine: tag,
            region: platformRegion,
          }),
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router.isReady, riotId]);

  return (
    <div className="profile-container">
      <h1 className="profile-title">Riot Profile for {gameName}#{tagLine}</h1>

      {loading && <p className="loading-text">Loading...</p>}
      {error && <p className="error-text">{error}</p>}

      {data && profile && (
        <div className="profile-header">
          <img
            src={`https://ddragon.leagueoflegends.com/cdn/15.15.1/img/profileicon/${profile.profileIconId}.png`}
            alt={`${gameName} Profile Icon`}
            className="profile-icon"
          />
          <h2 className="profile-name">{data.gameName} — level {profile.summonerLevel}</h2>
        </div>
      )}

      {/* Ranked Info */}
      {rankEntries.length > 0 && (
        <div className="section">
          <h3 className="section-title">Ranked Info</h3>
          <ul className="list-box">
            {rankEntries.map((entry, idx) => (
              <li key={idx}>
                {entry.queueType}: {entry.tier} {entry.rank} — {entry.leaguePoints} LP
                ({entry.wins}W/{entry.losses}L) — {(entry.wins / (entry.wins + entry.losses) * 100).toFixed(2)}%
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Winrate */}
      {winrateData && (
        <div className="section">
          <h3 className="section-title">
            Winrate (Last {winrateData.gamesAnalyzed} Games)
          </h3>
          <p>{winrateData.winrate}% — {winrateData.wins}W / {winrateData.losses}L</p>
          <p>Total Kills: {winrateData.totalKills}</p>
          <p>Total Deaths: {winrateData.totalDeaths}</p>
          <p>Most Kills in a Game: {winrateData.mostKills}</p>
          <p>Most Deaths in a Game: {winrateData.mostDeaths}</p>
          <ul className="list-box">
            {Object.entries(winrateData.championStats).map(([champId, stats]: any, idx) => {
              const champName = typedChampionData[champId]?.name || `Unknown (${champId})`;
              const winrate = (stats.wins / stats.games) * 100;
              const kda = stats.deaths > 0
                ? ((stats.kills + stats.assists) / stats.deaths).toFixed(2)
                : ((stats.kills + stats.assists) / 1).toFixed(2);
              return (
                <li key={idx}>
                  {champName}: {stats.games} game(s), {winrate.toFixed(0)}% winrate, KDA: {kda}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Masteries */}
      {masteries && Object.keys(masteries).length > 0 && (() => {
        const entries = Object.entries(masteries);
        const [lowestChampId, lowestData] = entries.reduce(
          (minEntry, currEntry) =>
            currEntry[1].championPoints < minEntry[1].championPoints ? currEntry : minEntry
        );

        return (
          <div className="section">
            <h3 className="section-title">Champion Masteries</h3>

            {/* Lowest mastery callout */}
            <div className="callout">
              🐢 <strong>Lowest Mastery Champion:</strong>{' '}
              {typedChampionData[lowestChampId]?.name || `Unknown (${lowestChampId})`} —{' '}
              {lowestData.championPoints.toLocaleString()} points
            </div>

            <ul className="mastery-list">
              {entries
                .sort(([, a], [, b]) => b.championPoints - a.championPoints)
                .map(([champId, data], idx) => {
                  const champName = typedChampionData[champId]?.name || `Unknown (${champId})`;
                  const sanitizedChampName = specialCases[champName]
                    || champName.replace(/\s/g, '').replace(/[^a-zA-Z]/g, '');
                  return (
                    <li key={idx} className="mastery-item">
                      <img
                        src={`/img/champions/${sanitizedChampName}.png`}
                        alt={champName}
                        className="champion-icon"
                      />
                      <span>
                        {champName} - Mastery Points: {data.championPoints.toLocaleString()}
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
