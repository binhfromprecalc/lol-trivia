type Player = {
  id: string;
  name: string;
};

type Lobby = {
  id: string;
  players: Player[];
};

const lobbies: Record<string, Lobby> = {};

export function createLobby(lobbyId: string): Lobby {
  const newLobby: Lobby = { id: lobbyId, players: [] };
  lobbies[lobbyId] = newLobby;
  return newLobby;
}

export function getLobby(lobbyId: string): Lobby | null {
  return lobbies[lobbyId] || null;
}

export function joinLobby(lobbyId: string, player: Player): Lobby | null {
  const lobby = lobbies[lobbyId];
  if (!lobby) return null;
  if (!lobby.players.find(p => p.id === player.id)) {
    lobby.players.push(player);
  }
  return lobby;
}
