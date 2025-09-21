import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import socket from '../utils/socket';

export default function GamePage() {
  const { lobbyId } = useRouter().query;
  const [players, setPlayers] = useState<string[]>([]);
  const [question, setQuestion] = useState<string | null>(null);
  

  useEffect(() => {
    if (!lobbyId || typeof lobbyId !== 'string') return;

    // Fetch the lobby players (so game knows who's in)
    fetch(`/api/lobby/${lobbyId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.players) setPlayers(data.players);
      })
      .catch(console.error);

    socket.emit('join-lobby', { lobbyId });

    // Listen for game start
    return () => {
      socket.off('start-game');
    };
  }, [lobbyId]);

  if (!lobbyId) return <p>Loading game...</p>;

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white shadow rounded">
      <h1 className="text-2xl font-bold mb-4 text-center">
        Game Started — Lobby <code>{lobbyId}</code>
      </h1>

      <h2 className="text-lg font-semibold mb-2">Players:</h2>
      <ul className="list-disc list-inside mb-6 border p-3 rounded max-h-60 overflow-auto">
        {players.length > 0 ? (
          players.map((p, idx) => <li key={idx}>{p}</li>)
        ) : (
          <p className="italic text-gray-500">Loading players...</p>
        )}
      </ul>

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Current Question:</h2>
        {question ? (
          <p className="text-xl">{question}</p>
        ) : (
          <p className="italic text-gray-500">Waiting for the first question...</p>
        )}
      </div>
    </div>
  );
}
