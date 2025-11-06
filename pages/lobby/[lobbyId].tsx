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
  id: string;
  gameName: string;
  tagLine: string;
  riotId: string;
  profileIconId?: number | null;
}

interface Lobby {
  id: string;
  code: string;
  started: boolean;
  players: Player[];
  host?: Player | null; 
}

export default function LobbyPage() {
  const router = useRouter();
  const { lobbyId } = router.query;
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [playerName, setPlayerName] = useState<string>("");
  useEffect(() => {
    if (!lobbyId || typeof lobbyId !== "string") return;

    fetch(`/api/lobby/${lobbyId}`)
      .then((res) => res.json())
      .then((data: Lobby) => {
        setLobby(data);
        setPlayers(data.players ?? []);
      })
      .catch(console.error);

    const riotId = localStorage.getItem("riotId");
    if (riotId) {
      socket.emit("join-lobby", { lobbyId, playerName: riotId });
      setPlayerName(riotId);
    }

    const handlePlayerJoined = ({ player }: { player: Player }) => {
      setPlayers((prev) =>
        prev.some((p) => p.riotId === player.riotId) ? prev : [...prev, player]
      );
    };

    const handlePlayerLeft = ({ playerName }: { playerName: string }) => {
      setPlayers((prev) => prev.filter((p) => p.gameName !== playerName));
    };

    const handleChatMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

    const handleSystemMessage = (msg: { text: string }) => {
      setMessages((prev) => [
        ...prev,
        { player: "SYSTEM", text: msg.text, system: true },
      ]);
    };

    const handleStartGame = ({ lobbyId }: { lobbyId: string }) => {
      router.push(`/game/${lobbyId}`);
    };

    const handleLobbyState = ({ lobby }: { lobby: Lobby }) => {
      setLobby(lobby);
      setPlayers(lobby.players ?? []);
    };

    socket.on("player-joined", handlePlayerJoined);
    socket.on("player-left", handlePlayerLeft);
    socket.on("chat-message", handleChatMessage);
    socket.on("system-message", handleSystemMessage);
    socket.on("lobby-state", handleLobbyState);
    socket.on("start-game", handleStartGame);

    return () => {
      socket.off("player-joined", handlePlayerJoined);
      socket.off("player-left", handlePlayerLeft);
      socket.off("chat-message", handleChatMessage);
      socket.off("system-message", handleSystemMessage);
      socket.off("lobby-state", handleLobbyState);
      socket.off("start-game", handleStartGame);
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

  const isHost =
    lobby.host &&
    playerName &&
    lobby.host.riotId === playerName; 

  return (
    <div className="lobby-container">
      <h1 className="lobby-title">
        Lobby Code: <code>{lobby.code}</code>
      </h1>
      <p className="lobby-host">
        Host:{" "}
        <strong>
          {lobby.host ? lobby.host.gameName : "Unknown host"}
        </strong>
      </p>

      {/* Players list */}
      <h2 className="section-title">Players:</h2>
      <ul className="players-list">
        {players.length > 0 ? (
          players.map((p) => (
            <li key={p.riotId} className="player-item">
              {p.gameName}#{p.tagLine}
            </li>
          ))
        ) : (
          <p className="empty-text">No players yet...</p>
        )}
      </ul>

      {isHost && !lobby.started && (
        <button className="start-button" onClick={handleStartGame}>
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
