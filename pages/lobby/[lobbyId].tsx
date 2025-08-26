import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import socket from '../utils/socket';
import type { Lobby } from '../api/lib/lobbies';
import './lobby.css'; 

interface ChatMessage {
  player: string;
  text: string;
}

export default function LobbyPage() {
  const { lobbyId } = useRouter().query;
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
  if (!lobbyId || typeof lobbyId !== 'string') return;

  // Fetch lobby data
  fetch(`/api/lobby/${lobbyId}`)
    .then((res) => res.json())
    .then(setLobby)
    .catch(console.error);

  // Get player name from localStorage
  const riotId = localStorage.getItem('riotId');
  if (riotId) {
    socket.emit('join-lobby', { lobbyId, playerName: riotId });
  }

  // Listen for player join events
  socket.on('player-joined', ({ playerName }: { playerName: string }) => {
    setLobby((prev) => {
      if (!prev) return null;
      if (prev.players.includes(playerName)) return prev;
      return { ...prev, players: [...prev.players, playerName] };
    });
  });

  // Listen for chat messages from server
  socket.on('chat-message', (msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  });

  return () => {
    socket.off('player-joined');
    socket.off('chat-message');
  };
}, [lobbyId]);


  const sendMessage = () => {
  if (!newMessage.trim() || !lobbyId || typeof lobbyId !== 'string') return;
  socket.emit('chat-message', { lobbyId, text: newMessage }); // include lobbyId
  setNewMessage('');
};


  if (!lobby) return <p className="loading">Loading lobby...</p>;

  return (
    <div className="lobby-container">
      <h1 className="lobby-title">
        Lobby ID: <code>{lobby.id}</code>
      </h1>
      <p className="lobby-host">
        Host: <strong>{lobby.host}</strong>
      </p>

      {/* Players list */}
      <h2 className="section-title">Players:</h2>
      <ul className="players-list">
        {lobby?.players?.length > 0 ? (
          lobby.players.map((p, idx) => (
            <li key={idx} className="player-item">{p}</li>
          ))
        ) : (
          <p className="empty-text">No players yet...</p>
        )}
      </ul>

      {/* Start button */}
      <button
        className="start-button"
        onClick={() => console.log('Start button clicked')}
      >
        Start Game
      </button>

      {/* Chat box */}
      <div className="chat-section">
        <h2 className="section-title">Chat:</h2>
        <div id="chat-messages" className="chat-messages">
          {messages.map((m, idx) => (
            <div key={idx} className="chat-message">
              <span className="chat-player">{m.player}: </span>
              <span>{m.text}</span>
            </div>
          ))}
        </div>
        <div className="chat-input-container">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="chat-input"
            placeholder="Type a message..."
          />
          <button className="send-button" onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
}
