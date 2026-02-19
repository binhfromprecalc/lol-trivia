import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import championData from '@data/champions.json';
import { setSocketRiotId } from '@utils/socket';
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
  const [puuid, setPuuid] = useState('');
  const [platformRegion, setPlatformRegion] = useState('na1');
  const [isBaseLoading, setIsBaseLoading] = useState(false);
  const [isWinrateLoading, setIsWinrateLoading] = useState(false);
  const baseRequestRef = useRef(0);
  const winrateRequestRef = useRef(0);
  const lastSyncedKeyRef = useRef('');

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
    const requestId = ++baseRequestRef.current;
    const controller = new AbortController();
    const { signal } = controller;
    const isStale = () => baseRequestRef.current !== requestId || signal.aborted;

    const [name, tag] = riotId.split('#');
    if (!name || !tag) {
      setError('Riot ID must be in the format Name#Tag (e.g. Faker#KR)');
      return () => controller.abort();
    }
    setSocketRiotId(riotId);

    const fetchBaseData = async () => {
      setError('');
      setIsBaseLoading(true);
      setIsWinrateLoading(true);
      setData(null);
      setProfile(null);
      setMasteries([]);
      setRankEntries([]);
      setWinrateData(null);
      setPuuid('');
      setGameName(name);
      setTagLine(tag);

      try {
        const accountRes = await fetch(
          `/api/account?gameName=${encodeURIComponent(name)}&tagLine=${encodeURIComponent(tag)}`,
          { signal }
        );
        const accountResult = await accountRes.json();
        if (!accountRes.ok) throw new Error(accountResult.error || 'Unknown error');
        if (isStale()) return;

        const regionMap: Record<string, string> = {
          NA1: 'na1', EUW1: 'euw1', KR: 'kr', EUN1: 'eun1',
          JP1: 'jp1', BR1: 'br1', OC1: 'oc1', RU: 'ru',
          TR1: 'tr1', LA1: 'la1', LA2: 'la2',
        };
        const mappedPlatformRegion = regionMap[tag.toUpperCase()] || 'na1';
        setPlatformRegion(mappedPlatformRegion);
        setPuuid(accountResult.puuid);

        const [profileRes, masteryRes, rankRes] = await Promise.all([
          fetch(`/api/summoner?puuid=${encodeURIComponent(accountResult.puuid)}`, { signal }),
          fetch(
            `/api/masteries?puuid=${encodeURIComponent(accountResult.puuid)}&platformRegion=${mappedPlatformRegion}`,
            { signal }
          ),
          fetch(
            `/api/rank?puuid=${encodeURIComponent(accountResult.puuid)}&platformRegion=${mappedPlatformRegion}`,
            { signal }
          ),
        ]);

        const [profileResult, masteryResult, rankResult] = await Promise.all([
          profileRes.json(),
          masteryRes.json(),
          rankRes.json(),
        ]);

        if (!profileRes.ok) throw new Error(profileResult.error || 'Error fetching icon');
        if (!masteryRes.ok) throw new Error(masteryResult.error || 'Error fetching masteries');
        if (!rankRes.ok) throw new Error(rankResult.error || 'Error fetching rank info');
        if (isStale()) return;

        setData(accountResult);
        setProfile(profileResult);
        setMasteries(masteryResult);
        setRankEntries(rankResult);
      } catch (err: any) {
        if (err?.name === 'AbortError' || isStale()) return;
        setError(err.message);
        setIsWinrateLoading(false);
      } finally {
        if (!isStale()) {
          setIsBaseLoading(false);
        }
      }
    };

    fetchBaseData();

    return () => {
      controller.abort();
    };
  }, [router.isReady, riotId]);

  useEffect(() => {
    if (!puuid || typeof riotId !== 'string') return;
    const requestId = ++winrateRequestRef.current;
    const controller = new AbortController();
    const { signal } = controller;
    const isStale = () => winrateRequestRef.current !== requestId || signal.aborted;

    const fetchWinrateData = async () => {
      setIsWinrateLoading(true);
      setError('');
      try {
        const winrateParams = new URLSearchParams({ puuid });
        if (queueFilter === 'ranked') {
          winrateParams.set('queueType', '420');
        }

        const winrateRes = await fetch(`/api/winrate?${winrateParams.toString()}`, { signal });
        const winrateResult = await winrateRes.json();
        if (!winrateRes.ok) throw new Error(winrateResult.error || 'Error fetching winrate');
        if (isStale()) return;

        setWinrateData(winrateResult);

      } catch (err: any) {
        if (err?.name === 'AbortError' || isStale()) return;
        setError(err.message);
      } finally {
        if (!isStale()) {
          setIsWinrateLoading(false);
        }
      }
    };

    fetchWinrateData();

    return () => {
      controller.abort();
    };
  }, [puuid, queueFilter, riotId]);

  useEffect(() => {
    if (queueFilter !== 'all') return;
    if (!data || !profile || !winrateData || typeof riotId !== 'string') return;

    const syncKey = `${riotId}|${winrateData.gamesAnalyzed}|${winrateData.winrate}`;
    if (lastSyncedKeyRef.current === syncKey) return;
    lastSyncedKeyRef.current = syncKey;

    const [name, tag] = riotId.split('#');
    if (!name || !tag) return;

    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account: data,
        summoner: profile,
        rankedEntries: rankEntries,
        masteries,
        winrate: winrateData,
        gameName: name,
        tagLine: tag,
        platformRegion,
      }),
    }).catch(() => {});
  }, [queueFilter, data, profile, rankEntries, masteries, winrateData, riotId, platformRegion]);

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
    setSocketRiotId(searchRiotId);
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
      setSocketRiotId(riotId);
      const joinedLobby = await res.json();
      setLobby(joinedLobby);
      router.push(`/lobby/${joinedLobby.id}`);
    } catch (err: any) {
      setError(err.message || 'Error joining lobby');
    }
  };

  const handleNavigateToProfile = (targetRiotId: string) => {
    setShowPopup(false);
    setSocketRiotId(targetRiotId);
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

  const isProfileLoading = isBaseLoading || isWinrateLoading;

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
      {isProfileLoading && (
        <p className="empty-text">Loading profile, match history, and mastery data...</p>
      )}

      {!isProfileLoading && data && profile && (
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
      {!isProfileLoading && statsView === 'matches' && rankEntries.length > 0 && (
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
      {!isProfileLoading && statsView === 'matches' && winrateData && (
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
          <div className="matches-layout">
            <div className="matches-main-panel">
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
          <ul className="list-box champion-stats-list">
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

            </div>
            <div className="matches-history-panel">
              <h3 className="section-title">Match History</h3>
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
          </div>
        </div>
      )}

      {/* Masteries */}
      {!isProfileLoading && statsView === 'mastery' && masteries && Object.keys(masteries).length > 0 && (() => {
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
