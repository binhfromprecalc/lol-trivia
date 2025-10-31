import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import socket from "@utils/socket";
import "@styles/lobby.css";

interface ChatMessage {
  player: string;
  text: string;
  system?: boolean;
}

interface Player {
  gameName: string;
  tagLine: string;
  profileIconId: number;
}

interface Lobby {
  id: string;
  code: string;
  started: boolean;
  players: Player[];
  host: Player;
}

export default function LobbyPage() {
  const { lobbyId } = useRouter().query;
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [playerName, setPlayerName] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    if (!lobbyId || typeof lobbyId !== "string") return;

    // Fetch initial lobby data
    fetch(`/api/lobby/${lobbyId}`)
      .then((res) => res.json())
      .then((data: Lobby) => {
        setLobby(data);
        setPlayers(data.players || []);
      })
      .catch(console.error);

    const riotId = localStorage.getItem("riotId");
    if (riotId) {
      socket.emit("join-lobby", { lobbyId, playerName: riotId });
      setPlayerName(riotId);
    }

    // Player joined
    const handlePlayerJoined = ({ player }: { player: Player }) => {
      setPlayers((prev) =>
        prev.find((p) => p.gameName === player.gameName) ? prev : [...prev, player]
      );
    };
    socket.on("player-joined", handlePlayerJoined);

    socket.on('lobby-state', ({ players }) => {
      setLobby(prev => prev ? { ...prev, players } : prev);
    });

    // Player left
    const handlePlayerLeft = ({ playerName }: { playerName: string }) => {
      setPlayers((prev) => prev.filter((p) => p.gameName !== playerName));
    };
    socket.on("player-left", handlePlayerLeft);
    
    // Chat messages
    const handleChatMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };
    socket.on("chat-message", handleChatMessage);

    // Start game
    socket.on("start-game", ({lobbyId}) => {
      router.push(`/game/${lobbyId}`);
    })

    // System messages
    const handleSystemMessage = (msg: { text: string }) => {
      setMessages((prev) => [...prev, { player: "SYSTEM", text: msg.text, system: true }]);
    };
    socket.on("system-message", handleSystemMessage);

    return () => {
      socket.off("player-joined", handlePlayerJoined);
      socket.off("player-left", handlePlayerLeft);
      socket.off("chat-message", handleChatMessage);
      socket.off("system-message", handleSystemMessage);
      socket.off("start-game");
    };
  }, [lobbyId]);

  const sendMessage = () => {
    if (!newMessage.trim() || !lobbyId || typeof lobbyId !== "string") return;

    socket.emit("chat-message", { lobbyId, text: newMessage });
    setNewMessage("");
  };

  const handleStartGame = () => {
    socket.emit("start-game", { lobbyId });
  };

  if (!lobby) return <p className="loading">Loading lobby...</p>;

  return (
    <div className="lobby-container">
      <h1 className="lobby-title">
        Lobby ID: <code>{lobby.id}</code>
      </h1>
      <p className="lobby-host">
        Host: <strong>{lobby.host.gameName}</strong>
      </p>

      {/* Players list */}
      <h2 className="section-title">Players:</h2>
      <ul className="players-list">
        {players.length > 0 ? (
          players.map((p, idx) => (
            <li key={idx} className="player-item">
              {p.gameName}
            </li>
          ))
        ) : (
          <p className="empty-text">No players yet...</p>
        )}
      </ul>

      {playerName === lobby.host.gameName && !lobby.started && (
        <button
          className="start-button"
          onClick={handleStartGame}
        >
          Start Game
        </button>
      )}

      {/* Chat section */}
      <div className="chat-section">
        <h2 className="section-title">Chat:</h2>
        <div id="chat-messages" className="chat-messages">
          {messages.map((m, idx) => (
            <div key={idx} className="chat-message">
              {m.system ? (
                <em className="system-message">{m.text}</em>
              ) : (
                <>
                  <span className="chat-player">{m.player}: </span>
                  <span>{m.text}</span>
                </>
              )}
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
          <button className="send-button" onClick={sendMessage}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
