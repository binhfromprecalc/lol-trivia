import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import socket from "@utils/socket";
import "@styles/game.css";

interface Player {
  id: string;
  gameName: string;
  tagLine: string;
  riotId: string;
  puuid: string | null;
  region: string | null;
  rank: string | null;
  winrate: number | null;
  mostKills: number | null;
  mostDeaths: number | null;
  profileIconId: number | null;
  summonerLevel: number | null;
}

interface ChatMessage {
  player: string;
  text: string;
  system?: boolean;
}

export default function GamePage() {
  const { lobbyId } = useRouter().query;
  const [players, setPlayers] = useState<Player[]>([]);
  const [question, setQuestion] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (!lobbyId || typeof lobbyId !== "string") return;

    fetch(`/api/lobby/${lobbyId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.players) setPlayers(data.players);
      })
      .catch(console.error);

    const riotId = localStorage.getItem("riotId");
    if (riotId) socket.emit("join-lobby", { lobbyId, playerName: riotId });

    socket.on("lobby-state", ({ lobby }) => {
      if (lobby.players) setPlayers(lobby.players);
    });

    socket.on("start-game", () => {
      console.log("Game started!");
    });

    socket.on("new-question", (q) => {
      setQuestion(q);
    });


    const handleChatMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("chat-message", handleChatMessage);

    return () => {
      socket.off("lobby-state");
      socket.off("start-game");
      socket.off("new-question");
      socket.off("chat-message", handleChatMessage);  
    };
  }, [lobbyId]);

  const sendMessage = () => {
    if (!newMessage.trim() || !lobbyId || typeof lobbyId !== "string") return;
    socket.emit("chat-message", { lobbyId, text: newMessage });
    setNewMessage("");
  };

  if (!lobbyId) return <p>Loading game...</p>;

  return (
    <div className="lobby-container">
      <h2 className="section-title">Current Question:</h2>

      {question ? (
        <p className="question">{question}</p>
      ) : (
        <p className="question">Waiting for the first question...</p>
      )}
      <div className="chat-box">

        <ul className="players-list">
          {players.map((p) => (
            <li key={p.riotId} className="profile-name">
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/15.15.1/img/profileicon/${p.profileIconId}.png`}
                alt={`${p.gameName} Profile Icon`}
                className="profile-icon"
              />
              {p.gameName}#{p.tagLine}
            </li>
          ))}
        </ul>

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
