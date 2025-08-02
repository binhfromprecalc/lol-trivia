import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import socket from '../utils/socket';
import type { Lobby } from '../api/lib/lobbies';

export default function LobbyPage() {
  const { lobbyId } = useRouter().query;
  const [lobby, setLobby] = useState<Lobby | null>(null);

  // Fetch lobby data and setup WebSocket on mount
  useEffect(() => {
    if (!lobbyId || typeof lobbyId !== 'string') return;

    // Initial lobby fetch
    fetch(`/api/lobby/${lobbyId}`)
      .then((res) => res.json())
      .then(setLobby)
      .catch(console.error);

    // Join the WebSocket room
    socket.emit('join-lobby', { lobbyId });

    // Update player list when someone joins
    socket.on('player-joined', ({ playerName }: { playerName: string }) => {
      setLobby((prev) => {
        if (!prev) return null;
        // Avoid duplicate names
        if (prev.players.includes(playerName)) return prev;
        return { ...prev, players: [...prev.players, playerName] };
      });
    });

    return () => {
      socket.off('player-joined');
    };
  }, [lobbyId]);

  if (!lobby) return <p className="text-center mt-10 text-lg">Loading lobby...</p>;

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white shadow rounded">
      <h1 className="text-2xl font-bold mb-4 text-center">
        Lobby ID: <code>{lobby.id}</code>
      </h1>
      <p className="text-center text-sm text-gray-600 mb-4">
        Host: <strong>{lobby.host}</strong>
      </p>

      <h2 className="text-lg font-semibold mb-2">Players:</h2>
      <ul className="list-disc list-inside mb-6 border p-3 rounded max-h-60 overflow-auto">
        {lobby?.players?.length > 0 ? (
          lobby.players.map((p, idx) => (
            <li key={idx}>{p}</li>
          ))
        ) : (
          <p className="italic text-gray-500">No players yet...</p>
        )}
      </ul>

      <button
        className="bg-blue-600 text-white px-4 py-2 w-full rounded hover:bg-blue-700 transition"
        onClick={() => console.log('Start button clicked')}
      >
        Start Game
      </button>
    </div>
  );
}
