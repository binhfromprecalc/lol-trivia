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

  async function fetchProfileIcon(player: Player): Promise<number> {
    try {
      const { gameName, tagLine } = player;
      const accRes = await fetch(`/api/account?gameName=${gameName}&tagLine=${tagLine}`);
      const account = await accRes.json();

      const profileRes = await fetch(`/api/summoner?puuid=${encodeURIComponent(account.puuid)}`);
      const profile = await profileRes.json();

      return profile.profileIconId ?? 0;
    } catch (err) {
      console.error("Error fetching profile icon for", player.riotId, err);
      return 0;
    }
  }

  async function mergePlayersWithIcons(current: Player[], incoming: Player[]): Promise<Player[]> {
    const map = new Map<string, Player>();

    for (const p of current) map.set(p.riotId, p);

    for (const p of incoming) {
      const existing = map.get(p.riotId);
      let profileIconId = p.profileIconId ?? existing?.profileIconId;
      if (profileIconId == null) {
        profileIconId = await fetchProfileIcon(p);
      }
      map.set(p.riotId, { ...existing, ...p, profileIconId });
    }

    return Array.from(map.values());
  }

  useEffect(() => {
    if (!lobbyId || typeof lobbyId !== "string") return;

    let joinedViaSocket = false;

    const riotId = localStorage.getItem("riotId");
    if (!riotId) return;
    setPlayerName(riotId);

    socket.emit("join-lobby", { lobbyId, playerName: riotId });
    joinedViaSocket = true;

    fetch(`/api/lobby/${lobbyId}`)
      .then((res) => res.json())
      .then(async (data: Lobby) => {
        setLobby(data);

        const playersWithIcons = await mergePlayersWithIcons([], data.players ?? []);
        setPlayers(playersWithIcons);
      })
      .catch(console.error);

    const handleLobbyState = async ({ lobby }: { lobby: Lobby }) => {
      setLobby(lobby);
      const updatedPlayers = await mergePlayersWithIcons(players, lobby.players ?? []);
      setPlayers(updatedPlayers);
    };

    const handlePlayerJoined = async ({ player }: { player: Player }) => {
      const updatedPlayers = await mergePlayersWithIcons(players, [player]);
      setPlayers(updatedPlayers);
    };

    const handlePlayerLeft = ({ playerName }: { playerName: string }) => {
      setPlayers((prev) => prev.filter((p) => p.riotId !== playerName));
    };

    const handleChatMessage = (msg: ChatMessage) => setMessages((prev) => [...prev, msg]);
    const handleSystemMessage = (msg: { text: string }) =>
      setMessages((prev) => [...prev, { player: "SYSTEM", text: msg.text, system: true }]);
    const handleStartGame = ({ lobbyId }: { lobbyId: string }) => router.push(`/game/${lobbyId}`);

    socket.on("lobby-state", handleLobbyState);
    socket.on("player-joined", handlePlayerJoined);
    socket.on("player-left", handlePlayerLeft);
    socket.on("chat-message", handleChatMessage);
    socket.on("system-message", handleSystemMessage);
    socket.on("start-game", handleStartGame);

    return () => {
      socket.off("lobby-state", handleLobbyState);
      socket.off("player-joined", handlePlayerJoined);
      socket.off("player-left", handlePlayerLeft);
      socket.off("chat-message", handleChatMessage);
      socket.off("system-message", handleSystemMessage);
      socket.off("start-game", handleStartGame);

      if (joinedViaSocket) socket.emit("leave-lobby", { lobbyId });
    };
  }, [lobbyId]);

  const sendMessage = () => {
    if (!newMessage.trim() || !lobbyId || typeof lobbyId !== "string") return;
    socket.emit("chat-message", { lobbyId, text: newMessage });
    setNewMessage("");
  };

  const handleStartGameClick = () => {
    socket.emit("start-game", { lobbyId });
  };

  if (!lobby) return <p className="loading">Loading lobby...</p>;

  const isHost = lobby.host?.riotId === playerName;

  return (
    <div className="lobby-container">
      <h1 className="lobby-title">
        Lobby Code: <code>{lobby.code}</code>
      </h1>

      <p className="lobby-host">
        Host: <strong>{lobby.host ? lobby.host.gameName : "Unknown host"}</strong>
      </p>

      <h2 className="section-title">Players:</h2>
      <ul className="players-list">
        {players.length > 0 ? (
          players.map((p) => (
            <li key={p.riotId} className="profile-name">
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/15.15.1/img/profileicon/${p.profileIconId}.png`}
                alt={`${p.gameName} Profile Icon`}
                className="profile-icon"
              />
              {p.gameName}#{p.tagLine}
            </li>
          ))
        ) : (
          <p className="empty-text">No players yet...</p>
        )}
      </ul>

      {isHost && !lobby.started && (
        <button className="start-button" onClick={handleStartGameClick}>
          Start Game
        </button>
      )}

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
