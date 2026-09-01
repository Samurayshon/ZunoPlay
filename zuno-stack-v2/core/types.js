export const GAME_STATUS = Object.freeze({ IDLE: 'idle', ACTIVE: 'active', WON: 'won', LOST: 'lost', FINISHED: 'finished' });

export function createTile({ id, family, x = 0, y = 0, layer = 0, removed = false }) {
  return { id: String(id), family: String(family), x, y, layer, removed: Boolean(removed) };
}

export function createBoardState({ tiles = [], layers = 0 } = {}) {
  return { layers, tiles: tiles.map((tile) => createTile(tile)) };
}

export function createPlayerState({ playerId, board = createBoardState(), tray = [], score = 0, combo = 0, pulse = 0, powers = {}, resources = {}, status = GAME_STATUS.IDLE }) {
  return { playerId: String(playerId), board, tray: [...tray], score, combo, pulse, powers: { ...powers }, resources: { ...resources }, status };
}

export function createGameState({ schemaVersion = 1, matchId = null, mode, seed, status = GAME_STATUS.IDLE, rulesetVersion = 'v2.1', players = [], shared = {}, startedAtLogical = null, finishedAtLogical = null }) {
  return { schemaVersion, matchId, mode: String(mode), seed: String(seed), status, rulesetVersion, players: players.map((player) => createPlayerState(player)), shared: structuredCloneSafe(shared), startedAtLogical, finishedAtLogical };
}

export function createCommand(type, actorId, payload = {}) {
  return { type: String(type), actorId: String(actorId), payload: structuredCloneSafe(payload) };
}

export function createDomainEvent(type, payload = {}) {
  return { type: String(type), payload: structuredCloneSafe(payload) };
}

export function createModeRules({ id, playerCount, board = {}, objectives = {}, limits = {}, allowedCommands = [] }) {
  return Object.freeze({ id: String(id), playerCount, board: structuredCloneSafe(board), objectives: structuredCloneSafe(objectives), limits: structuredCloneSafe(limits), allowedCommands: Object.freeze([...allowedCommands]) });
}

export function createRulesContext({ modeRules, logicalTime = 0, rng }) {
  if (!modeRules || typeof rng !== 'function') throw new TypeError('RulesContext requires modeRules and deterministic rng');
  return Object.freeze({ modeRules, logicalTime, rng });
}

export function transitionResult(state, events = [], accepted = true, rejection = null) {
  return { state, events, accepted, ...(rejection ? { rejection } : {}) };
}

function structuredCloneSafe(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}
