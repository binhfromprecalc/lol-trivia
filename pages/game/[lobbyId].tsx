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
  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [results, setResults] = useState<{
    correctIndex: number;
    counts: number[];
  } | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const riotId = localStorage.getItem("riotId");

  useEffect(() => {
    if (!lobbyId || typeof lobbyId !== "string") return;

    fetch(`/api/lobby/${lobbyId}`)
      .then((res) => res.json())
      .then((data) => data.players && setPlayers(data.players))
      .catch(console.error);

    if (riotId) socket.emit("join-lobby", { lobbyId, playerName: riotId });

    socket.on("lobby-state", ({ lobby }) => {
      if (lobby.players) setPlayers(lobby.players);
    });

    socket.on("new-question", ({ question, options, duration }) => {
      setQuestion(question);
      setOptions(options);
      setTimeLeft(duration);
      setSelected(null);
      setResults(null);
      setLocked(false);
    });

    socket.on("timer", ({ timeLeft }) => {
      setTimeLeft(timeLeft);
    });

    socket.on("answer-results", (data) => {
      setResults(data);
      setLocked(true);
    });

    socket.on("chat-message", (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("lobby-state");
      socket.off("new-question");
      socket.off("timer");
      socket.off("answer-results");
      socket.off("chat-message");
    };
  }, [lobbyId, riotId]);

  const submitAnswer = (index: number) => {
    if (locked || selected !== null) return;

    setSelected(index);
    setLocked(true);

    socket.emit("submit-answer", {
      lobbyId,
      answerIndex: index,
    });
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !lobbyId) return;
    socket.emit("chat-message", { lobbyId, text: newMessage });
    setNewMessage("");
  };

  if (!lobbyId) return <p>Loading game...</p>;

  return (
    <div className="game-container">
      <div className="top-bar">
        <div className="timer">{timeLeft}s</div>
      </div>

      <h2 className="question-text">
        {question ?? "Waiting for the first question..."}
      </h2>

      <div className="answers-grid">
        {options.map((opt, idx) => {
          let className = "answer-card";

          if (results) {
            if (idx === results.correctIndex) className += " correct";
            else if (idx === selected) className += " wrong";
          } else if (idx === selected) {
            className += " selected";
          }

          return (
            <button
              key={idx}
              className={className}
              onClick={() => submitAnswer(idx)}
              disabled={locked}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <div className="chat-box">
        <ul className="players-list">
          {players.map((p) => (
            <li key={p.riotId} className="profile-name">
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/15.15.1/img/profileicon/${p.profileIconId}.png`}
                className="profile-icon"
              />
              {p.gameName}#{p.tagLine}
            </li>
          ))}
        </ul>

        <div className="chat-messages">
          {messages.map((m, idx) => (
            <div key={idx} className="chat-message">
              <span className="chat-player">{m.player}: </span>
              {m.text}
            </div>
          ))}
        </div>

        <div className="chat-input-container">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="chat-input"
          />
          <button onClick={sendMessage} className="send-button">Send</button>
        </div>
      </div>
    </div>
  );
}
