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

export default function GamePage() {
  const { lobbyId } = useRouter().query;
  const [players, setPlayers] = useState<Player[]>([]);
  const [question, setQuestion] = useState<string | null>(null);

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

    return () => {
      socket.off("lobby-state");
      socket.off("start-game");
      socket.off("new-question");
    };
  }, [lobbyId]);

  if (!lobbyId) return <p>Loading game...</p>;

  return (
    <div className="lobby-container">
        <h2 className="section-title">Current Question:</h2>
        {question ? (
          <p className="question">{question}</p>
        ) : (
          <p className="question">
            Waiting for the first question...
          </p>
        )}
    </div>
  );
}
