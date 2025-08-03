import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import socket from './utils/socket';
import './index.css';

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

    const riotIdSlug = encodeURIComponent(`${gameName}-${tagLine}`) ;
    router.push(`/user/${riotIdSlug}`);
  };

  const handleCreateLobby = async () => {
  if (!riotId.includes('#')) {
    setError('Please enter a valid Riot ID (e.g. Faker#KR) before creating a lobby.');
    return;
  }

  try {
    const [gameName, tagLine] = riotId.split('#');

    const res = await fetch('/api/lobby/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player: { name: `${gameName}#${tagLine}`, id: `${gameName}-${tagLine}` }
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


  const handleJoinLobby = async () => {
    try {
      const res = await fetch('/api/lobby/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobbyId: joinLobbyId, riotId }),
      });
      if (!res.ok) throw new Error('Failed to join lobby');
      const joinedLobby = await res.json();
      setLobby(joinedLobby);
      router.push(`/lobby/${joinedLobby.id}`);
    } catch (err: any) {
      setError(err.message || 'Error joining lobby');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div className="w-full max-w-md bg-white p-6 rounded shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Rito Account Lookup</h1>

        {/* Riot ID Input */}
        <div className="w-full p-4 flex flex-col items-center">
          <input
            className="w-1/2 rounded-2xl border border-gray-300 bg-white p-3 text-sm shadow-sm focus:border-black focus:outline-none"
            placeholder="Enter Riot ID (e.g. Faker#KR)"
            value={riotId}
            onChange={(e) => setRiotId(e.target.value)}
          />
          <button
            className="bg-blue-600 text-white mt-3 px-6 py-2 rounded text-sm hover:bg-blue-700 transition disabled:opacity-50"
            onClick={handleFetch}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>

        {/* Create Lobby */}
        <div className="mt-4 flex justify-center">
            <button
              className="bg-green-600 text-white px-6 py-2 rounded text-sm"
              onClick={handleCreateLobby}
            >
              Create Lobby
            </button>
        </div>

        {/* Join Lobby */}
        <div className="mt-6 p-4 rounded flex flex-col items-center">
          <h3 className="font-semibold mb-2">Join a Lobby</h3>
          <input
            className="border px-2 py-2 w-1/2 mb-2 rounded text-sm"
            placeholder="Enter Lobby ID"
            value={joinLobbyId}
            onChange={(e) => setJoinLobbyId(e.target.value)}
          />
          <button
            className="bg-purple-600 text-white px-6 py-2 rounded text-sm"
            onClick={handleJoinLobby}
          >
            Join Lobby
          </button>
        </div>

        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
    </div>
  );
}
