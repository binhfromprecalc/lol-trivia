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

interface AnswerResultsPayload {
  answer: string | number;
  counts: number[];
  pointDeltas?: Record<string, number>;
  scores?: Record<string, number>;
}

export default function GamePage() {
  const { lobbyId } = useRouter().query;
  const [players, setPlayers] = useState<Player[]>([]);
  const [question, setQuestion] = useState<string | null>(null);
  const [options, setOptions] = useState<(string | number)[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [freeAnswer, setFreeAnswer] = useState("");
  const [submittedFreeAnswer, setSubmittedFreeAnswer] = useState("");
  const [freeAnswerStatus, setFreeAnswerStatus] = useState<"correct" | "wrong" | null>(null);
  const [results, setResults] = useState<{
    answer: string | number;
    counts: number[];
  } | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [pointDeltas, setPointDeltas] = useState<Record<string, number>>({});
  const [pointDeltaToken, setPointDeltaToken] = useState(0);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const riotId = localStorage.getItem("riotId");

  useEffect(() => {
    if (!lobbyId || typeof lobbyId !== "string") return;

    fetch(`/api/lobby/${lobbyId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.players) return;
        setPlayers(data.players);
        setScores((prev) => {
          const next = { ...prev };
          for (const player of data.players) {
            if (next[player.riotId] === undefined) next[player.riotId] = 0;
          }
          return next;
        });
      })
      .catch(console.error);

    if (riotId) socket.emit("join-lobby", { lobbyId, playerName: riotId });

    socket.on("lobby-state", ({ lobby }) => {
      if (!lobby.players) return;
      setPlayers(lobby.players);
      setScores((prev) => {
        const next = { ...prev };
        for (const player of lobby.players) {
          if (next[player.riotId] === undefined) next[player.riotId] = 0;
        }
        return next;
      });
    });

    socket.on("new-question", ({ question, options, duration, scores }) => {
      setQuestion(question);
      setOptions(Array.isArray(options) ? options : []);
      setTimeLeft(duration);
      setSelected(null);
      setFreeAnswer("");
      setSubmittedFreeAnswer("");
      setFreeAnswerStatus(null);
      setResults(null);
      setLocked(false);
      if (scores && typeof scores === "object") {
        setScores(scores);
      }
    });

    socket.on("timer", ({ timeLeft }) => {
      setTimeLeft(timeLeft);
    });

    socket.on("answer-results", (data: AnswerResultsPayload) => {
      setResults(data);
      setLocked(true);
      if (data.scores) {
        setScores(data.scores);
      }
      if (data.pointDeltas) {
        setPointDeltas(data.pointDeltas);
        setPointDeltaToken((prev) => prev + 1);
        setTimeout(() => setPointDeltas({}), 1400);
      }
    });

    socket.on("game-over", ({ message }) => {
      setQuestion(message || "Game over.");
      setOptions([]);
      setTimeLeft(0);
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
      socket.off("game-over");
      socket.off("chat-message");
    };
  }, [lobbyId, riotId]);

  const isFreeResponse =
    options.length === 0 || options.every((opt) => String(opt).trim() === "");

  const normalizeAnswer = (value: string | number) =>
    String(value).trim().toLowerCase();

  useEffect(() => {
    if (!results || !isFreeResponse || !submittedFreeAnswer) return;
    const isCorrect =
      normalizeAnswer(submittedFreeAnswer) === normalizeAnswer(results.answer);
    setFreeAnswerStatus(isCorrect ? "correct" : "wrong");
  }, [results, isFreeResponse, submittedFreeAnswer]);


  const submitAnswer = (index: number) => {
    if (locked || selected !== null) return;

    setSelected(index);
    setLocked(true);

    socket.emit("submit-answer", {
      lobbyId,
      answerIndex: index,
    });
  };

  const submitFreeAnswer = () => {
    if (locked || selected !== null) return;
    const trimmed = freeAnswer.trim();
    if (!trimmed) return;

    setSubmittedFreeAnswer(trimmed);
    setSelected(-1);
    setLocked(true);

    socket.emit("submit-answer", {
      lobbyId,
      answerIndex: -1,
      answerText: trimmed,
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
      <div className="left-rail">
        <div className="players-panel">
          <h3 className="section-title">Players</h3>
          <ul className="players-list game-players-list">
            {players.map((p) => (
              <li key={p.riotId} className="player-row">
                <img
                  src={`https://ddragon.leagueoflegends.com/cdn/15.15.1/img/profileicon/${p.profileIconId}.png`}
                  className="profile-icon"
                />
                <span className="player-identity">{p.gameName}#{p.tagLine}</span>
                <span className="player-points">{scores[p.riotId] ?? 0} pts</span>
                {pointDeltas[p.riotId] ? (
                  <span
                    key={`${p.riotId}-${pointDeltaToken}`}
                    className="point-delta"
                  >
                    +{pointDeltas[p.riotId]}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <div className="chat-box">
          <h3 className="section-title">Chat</h3>
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

      <div className="game-main">
        <div className="top-bar">
          <div className="timer">{timeLeft}s</div>
        </div>

        <h2 className="question-text">
          {question ?? "Waiting for the first question..."}
        </h2>

        {isFreeResponse ? (
          <div className="answers-grid">
            <input
              value={freeAnswer}
              onChange={(e) => setFreeAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitFreeAnswer()}
              className={`chat-input free-response-input${
                freeAnswerStatus ? ` ${freeAnswerStatus}` : ""
              }`}
              placeholder="Type your answer..."
              disabled={locked}
            />
            <button
              onClick={submitFreeAnswer}
              className="send-button"
              disabled={locked || !freeAnswer.trim()}
            >
              Submit
            </button>
          </div>
        ) : (
          <div className="answers-grid">
            {options.map((opt, idx) => {
              let className = "answer-card";

              if (results) {
                if (idx === selected) {
                  if (options[idx] === results.answer) className += " correct";
                  else className += " wrong";
                }
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
        )}
      </div>
    </div>
  );
}
