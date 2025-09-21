export interface Lobby {
  id: string;
  players: string[];
  host: string;
  started: boolean;
};

const lobbies: Record<string, Lobby> = {};


export function createLobby(host: string): Lobby {
  const id = Math.random().toString(36).substr(2, 6);
  const lobby: Lobby = { id, players: [host], host , started: false};
  lobbies[id] = lobby;
  return lobby;
}

export function getLobby(id: string): Lobby | null {
  return lobbies[id] || null;
}

export function joinLobby(id: string, playerName: string): Lobby | null {
  const lobby = lobbies[id];
  if (lobby && !lobby.players.includes(playerName)) {
    lobby.players.push(playerName);
  }
  return lobby;
}

export function startLobby(id: string) {
  const lobby = lobbies[id];
  if (lobby) {
    lobby.started = true;
  }
  return lobby;
}
