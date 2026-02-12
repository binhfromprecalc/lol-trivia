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
  const [lobby, setLobby] = useState<{ id: string; players: any[] } | null>(null);
  const [joinLobbyId, setJoinLobbyId] = useState('');
  const [error, setError] = useState('');
  const [searchRiotId, setSearchRiotId] = useState('');
  const [queueFilter, setQueueFilter] = useState<'all' | 'ranked'>('all');
  const [statsView, setStatsView] = useState<'matches' | 'mastery'>('matches');
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [showPopup, setShowPopup] = useState(false);

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

  const queueTypeMap: Record<number, string> = {
    420: 'Ranked Solo/Duo',
    430: 'Normal Blind Pick',
    440: 'Ranked Flex',
    450: 'ARAM',
    400: 'Normal Draft Pick',
    490: 'Quickplay',
    1700: 'Arena',
  };

  useEffect(() => {
    if (!router.isReady || typeof riotId !== 'string') return;
    const [name, tag] = riotId.split('#');
    if (!name || !tag) {
      setError('Riot ID must be in the format Name#Tag (e.g. Faker#KR)');
      return;
    }

    const fetchData = async () => {
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

        const winrateParams = new URLSearchParams({
          puuid: result.puuid,
        });
        if (queueFilter === 'ranked') {
          winrateParams.set('queueType', '420');
        }
        const winrateRes = await fetch(`/api/winrate?${winrateParams.toString()}`);
        const winrateResult = await winrateRes.json();
        if (!winrateRes.ok) throw new Error(winrateResult.error || 'Error fetching winrate');
        setWinrateData(winrateResult);

        if (queueFilter === 'all') {
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
        }
      } catch (err: any) {
        setError(err.message);
      }
    };
    fetchData();
  }, [router.isReady, riotId, queueFilter]);

  const handleCreateLobby = async () => {
    try {
      const res = await fetch('/api/lobby/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameName, tagLine, riotId,
        }),
      });

      if (!res.ok) throw new Error('Failed to create lobby');
      const newLobby = await res.json();
      setLobby(newLobby);
      router.push(`/lobby/${newLobby.id}`);
    } catch (err: any) {
      setError(err.message || 'Error creating lobby');
    }
  };

  const handleSearchProfile = () => {
    const [name, tag] = searchRiotId.split('#');
    if (!name || !tag) {
      setError('Please enter a Riot ID in the format Name#TAG (e.g., Faker#KR)');
      return;
    }

    setError('');
    localStorage.setItem('riotId', searchRiotId);
    router.push(`/user/${encodeURIComponent(searchRiotId)}`);
  };

  const handleJoinLobby = async () => {
    try {
      if (typeof riotId !== 'string') throw new Error('Invalid Riot ID');

      const res = await fetch('/api/lobby/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lobbyCode: joinLobbyId,
          gameName,
          tagLine,
          riotId,
        }),
      });

      if (!res.ok) throw new Error('Failed to join lobby');
      localStorage.setItem('riotId', riotId);
      const joinedLobby = await res.json();
      setLobby(joinedLobby);
      router.push(`/lobby/${joinedLobby.id}`);
    } catch (err: any) {
      setError(err.message || 'Error joining lobby');
    }
  };

  const handleNavigateToProfile = (targetRiotId: string) => {
    setShowPopup(false);
    localStorage.setItem('riotId', targetRiotId);
    router.push(`/user/${encodeURIComponent(targetRiotId)}`);
  };

  const matchHistoryEntries = Object.entries(winrateData?.matchStats ?? {});

  const formatTimeAgo = (timestamp: number | null | undefined) => {
    if (!timestamp) return 'time unknown';
    const diffMs = Date.now() - timestamp;
    if (diffMs < 60 * 1000) return 'just now';
    const diffMinutes = Math.floor(diffMs / (60 * 1000));
    if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <div className="profile-container">
      <div className="input-group">
        <input
          className="input-field"
          placeholder="Search another Riot ID (e.g. binh#NA1)"
          value={searchRiotId}
          onChange={(e) => setSearchRiotId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearchProfile()}
        />
        <button
          className="button blue"
          onClick={handleSearchProfile}
        >
          Search
        </button>
      </div>
      <h1 className="profile-title">Riot Profile for {gameName}#{tagLine}</h1>
      {error && <p className="error-text">{error}</p>}

      {data && profile && (
        <div className="profile-section">
          <div className="profile-info">
            <img
              src={`https://ddragon.leagueoflegends.com/cdn/15.15.1/img/profileicon/${profile.profileIconId}.png`}
              alt={`${gameName} Profile Icon`}
              className="profile-icon"
            />
            <h2 className="profile-name">{data.gameName} — level {profile.summonerLevel}</h2>
          </div>
          <div className="lobby-actions">
            <button
              className="button green"
              onClick={handleCreateLobby}
            >
              Create Lobby
            </button>

            <div className="input-group">
              <input
                className="input-field"
                placeholder="Enter Lobby ID"
                value={joinLobbyId}
                onChange={(e) => setJoinLobbyId(e.target.value)}
              />
              <button
                className="button blue"
                onClick={handleJoinLobby}
              >
                Join Lobby
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="stats-view-row">
        <button
          type="button"
          className={`button ${statsView === 'matches' ? 'blue' : 'green'}`}
          onClick={() => setStatsView('matches')}
        >
          Match Stats
        </button>
        <button
          type="button"
          className={`button ${statsView === 'mastery' ? 'blue' : 'green'}`}
          onClick={() => setStatsView('mastery')}
        >
          Champion Mastery
        </button>
      </div>

      {/* Ranked Info */}
      {statsView === 'matches' && rankEntries.length > 0 && (
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
      {statsView === 'matches' && winrateData && (
        <div className="section">
          <div className="queue-filter-row">
            <button
              type="button"
              className={`button ${queueFilter === 'all' ? 'blue' : 'green'}`}
              onClick={() => setQueueFilter('all')}
            >
              Last 20 Games
            </button>
            <button
              type="button"
              className={`button ${queueFilter === 'ranked' ? 'blue' : 'green'}`}
              onClick={() => setQueueFilter('ranked')}
            >
              Last 20 Ranked
            </button>
          </div>
          <h3 className="section-title">
            Winrate (
            Last {winrateData.gamesAnalyzed}{' '}
            {queueFilter === 'ranked' ? 'Ranked Solo/Duo Games' : 'Games'})
          </h3>
          <p>{winrateData.winrate}% — {winrateData.wins}W / {winrateData.losses}L</p>
          <p>Total Kills: {winrateData.totalKills}</p>
          <p>Total Deaths: {winrateData.totalDeaths}</p>
          <p>Most Kills in a Game: {winrateData.mostKills}</p>
          <p>Most Deaths in a Game: {winrateData.mostDeaths}</p>
          <ul className="list-box">
            {Object.entries(winrateData.championStats).map(([champName, stats]: any, idx) => {
              const winrate = (stats.wins / stats.games) * 100;
              const kda = stats.deaths > 0
                ? ((stats.kills + stats.assists) / stats.deaths).toFixed(2)
                : ((stats.kills + stats.assists) / 1).toFixed(2);
              const sanitizedChampName = specialCases[champName]
                    || champName.replace(/\s/g, '').replace(/[^a-zA-Z]/g, '');
              return (
                <li key={idx} className="list-item">
                  <img
                        src={`/img/champions/${sanitizedChampName}.png`}
                        alt={champName}
                        className="champion-icon"
                  />
                  {champName}: {stats.games} game(s), {winrate.toFixed(0)}% winrate, KDA: {kda}
                </li>
              );
            })}
          </ul>

          <ul className="match-history">
            {matchHistoryEntries.map(([matchId, stats]: any, idx) => {
              const champName = stats.champName;
              const sanitizedChampName = specialCases[champName]
                    || champName.replace(/\s/g, '').replace(/[^a-zA-Z]/g, '');
              const isWin = stats.win;
              const queueType = queueTypeMap[stats.queueType] || `Unknown Queue, Queue ID: ${stats.queueType}`;
              const timeAgo = formatTimeAgo(stats.endGameTime);
              return(
                <li key={idx} className={`match-card ${isWin ? 'win' : 'loss'}`} onClick={() => { setSelectedMatch(stats); setShowPopup(true); }}>
                  <div className="champion-section">
                    <img
                      src={`/img/champions/${sanitizedChampName}.png`}
                      alt={champName}
                      className="champion-icon"
                    />
                    <span className="champion-name">{champName}</span>
                  </div>

                  <div className="stats-section">
                    <span className="queue-type">{queueType} - {timeAgo}</span>
                    <span className="kda">
                      {stats.kills} / {stats.deaths} / {stats.assists} / CS: {stats.creepScore}
                    </span>
                    <span className="result">{isWin ? 'Victory' : 'Defeat'}</span>
                  </div>
                </li>
              );

          })}

          {matchHistoryEntries.length === 0 && (
            <li className="empty-text">No match history available right now.</li>
          )}
          </ul>
        </div>
      )}

      {/* Masteries */}
      {statsView === 'mastery' && masteries && Object.keys(masteries).length > 0 && (() => {
        const entries = Object.entries(masteries);
        const [lowestChampId, lowestData] = entries.reduce(
          (minEntry, currEntry) =>
            currEntry[1].championPoints < minEntry[1].championPoints ? currEntry : minEntry
        );

        return (
          <div className="section">
            <h3 className="section-title">Champion Masteries</h3>

            <div className="callout">
              <strong>Lowest Mastery Champion:</strong>{' '}
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

    {showPopup && selectedMatch && (() => {
      const participants = selectedMatch.participantStats
        ? Object.entries(selectedMatch.participantStats).map(([puuid, stats]) => ({
            puuid,
            ...(stats as any),
          }))
        : [];

      const isArena = queueTypeMap[selectedMatch.queueType] === 'Arena';

      const teamsMap: Record<number, any[]> = {};
      for (const p of participants) {
        if (!teamsMap[p.teamId]) {
          teamsMap[p.teamId] = [];
        }
        teamsMap[p.teamId].push(p);
      }

      const sortedTeamIds = Object.keys(teamsMap)
        .map(Number)
        .sort((a, b) => a - b);

      const getTeamName = (teamId: number, index: number) => {
        if (isArena) return `Team ${index + 1}`;
        return teamId === 100 ? 'Blue Team' : 'Red Team';
      };

      return (
        <div className="popup-overlay" onClick={() => setShowPopup(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <h3>Match Participants</h3>

            <div className={`teams-container ${isArena ? 'teams-grid' : ''}`}>
              {sortedTeamIds.map((teamId, teamIdx) => (
                <div key={teamId} className="team">
                  <h4>{getTeamName(teamId, teamIdx)}</h4>

                  <div className="stats-labels">
                    <span className="label-kda">KDA</span>
                    {!isArena && <span className="label-cs">CS</span>}
                  </div>

                  <ul>
                    {teamsMap[teamId].map((stats, idx) => {
                      const sanitizedChampName =
                        specialCases[stats.champName] ||
                        stats.champName
                          .replace(/\s/g, '')
                          .replace(/[^a-zA-Z]/g, '');

                      return (
                        <li key={idx} className="participant-item">
                          <img
                            src={`/img/champions/${sanitizedChampName}.png`}
                            alt={stats.champName}
                            className="champion-icon"
                          />

                          <span className="player-info">
                            <button
                              type="button"
                              className="player-link"
                              onClick={() => handleNavigateToProfile(stats.riotId)}
                            >
                              {stats.riotId}
                            </button>
                            {stats.champName}
                          </span>

                          <span className="kda-stat">
                            {stats.kills} / {stats.deaths} / {stats.assists}
                          </span>

                          {!isArena && (
                            <span className="cs-stat">
                              {stats.creepScore}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    })()}

    </>
  );
}
