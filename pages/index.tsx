import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import socket from '@utils/socket';
import '@styles/index.css'; 

export default function Home() {
  const [riotId, setRiotId] = useState('');
  const [joinLobbyId, setJoinLobbyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lobby, setLobby] = useState<{ id: string; players: any[] } | null>(null);

  const router = useRouter();

  useEffect(() => {
    fetch('/api/socket');
    socket.on('connect', () => console.log('Connected to WebSocket'));
    return () => {
      socket.off('connect');
    };
  }, []);

  const handleFetch = async () => {
    setLoading(true);
    setError('');

    const [gameName, tagLine] = riotId.split('#');
    if (!gameName || !tagLine) {
      setError('Please enter a Riot ID in the format Name#TAG (e.g., Faker#KR)');
      setLoading(false);
      return;
    }

    const riotIdSlug = encodeURIComponent(`${gameName}-${tagLine}`);
    router.push(`/user/${riotIdSlug}`);
  };

  const handleCreateLobby = async () => {
    if (!riotId.includes('#')) {
      setError('Please enter a valid Riot ID (e.g. binh#NA1) before creating a lobby.');
      return;
    }

    try {
      const [gameName, tagLine] = riotId.split('#');

      const res = await fetch('/api/lobby/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameName, tagLine, riotId,
        }),
      });

      if (!res.ok) throw new Error('Failed to create lobby');
      const newLobby = await res.json();
      localStorage.setItem('riotId', riotId);
      setLobby(newLobby);
      router.push(`/lobby/${newLobby.id}`);
    } catch (err: any) {
      setError(err.message || 'Error creating lobby');
    }
  };

  const handleJoinLobby = async () => {
    if (!riotId.includes('#')) {
      setError('Please enter a valid Riot ID (e.g. binh#NA1) before joining a lobby.');
      return;
    }

    try {
      const [gameName, tagLine] = riotId.split('#');

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

  return (
    <div className="home-container">
      <div className="home-card">
        <h1 className="home-title">Rito Account Lookup</h1>

        {/* Riot ID Input */}
        <div className="input-group">
          <input
            className="input-field"
            placeholder="Enter Riot ID (e.g. binh#NA1)"
            value={riotId}
            onChange={(e) => setRiotId(e.target.value)}
          />
          <button
            className="button blue"
            onClick={handleFetch}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>

        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}
