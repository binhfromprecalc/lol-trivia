// Simple in-memory lobby store
const lobbies: Record<string, { id: string; players: string[] }> = {};

export function createLobby(): { id: string; players: string[] } {
  const id = Math.random().toString(36).substr(2, 6); // random ID
  const lobby = { id, players: [] };
  lobbies[id] = lobby;
  return lobby;
}

export function getLobby(id: string) {
  return lobbies[id] || null;
}

export function joinLobby(id: string, playerName: string) {
  const lobby = lobbies[id];
  if (lobby && !lobby.players.includes(playerName)) {
    lobby.players.push(playerName);
  }
  return lobby;
}
