import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import socket from '@utils/socket';
import '@styles/game.css';

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
    <div className="lobby-container">
      <h1 className="lobby-title">
        Game Started — Lobby <code>{lobbyId}</code>
      </h1>

      <h2 className="section-title">Players:</h2>
      <ul className="players-list">
        {players.length > 0 ? (
          players.map((p, idx) => <li key={idx}>{p}</li>)
        ) : (
          <p className="italic text-gray-500">Loading players...</p>
        )}
      </ul>

      <div className="mt-6">
        <h2 className="section-title">Current Question:</h2>
        {question ? (
          <p className="text-xl">{question}</p>
        ) : (
          <p className="italic text-gray-500">Waiting for the first question...</p>
        )}
      </div>
    </div>
  );
}
