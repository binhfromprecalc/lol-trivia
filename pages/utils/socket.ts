import { io } from "socket.io-client";

const socket = io();
let socketRiotId: string | null = null;

export function setSocketRiotId(riotId: string) {
  const trimmed = riotId.trim();
  if (!trimmed) return;

  socketRiotId = trimmed;

  if (socket.connected) {
    socket.emit("set-identity", { riotId: trimmed });
  }
}

export function getSocketRiotId() {
  return socketRiotId;
}

socket.on("connect", () => {
  if (socketRiotId) {
    socket.emit("set-identity", { riotId: socketRiotId });
  }
});

export default socket;
