import { transitionResult } from './types.js';

export const CORE_COMMANDS = Object.freeze({ START_MATCH: 'START_MATCH' });

const handlers = Object.freeze({
  [CORE_COMMANDS.START_MATCH]: startMatch,
});

export function transition(state, command, context) {
  if (!state || !command || !context) return reject(state, 'INVALID_TRANSITION_INPUT');
  if (!context.modeRules.allowedCommands.includes(command.type)) return reject(state, 'COMMAND_NOT_ALLOWED');
  const handler = handlers[command.type];
  if (!handler) return reject(state, 'COMMAND_NOT_IMPLEMENTED');
  return handler(state, command, context);
}

function startMatch(state, command, context) {
  if (state.status !== 'idle') return reject(state, 'MATCH_ALREADY_STARTED');
  if (!state.players.some((player) => player.playerId === command.actorId)) return reject(state, 'UNKNOWN_ACTOR');
  const next = { ...state, status: 'active', startedAtLogical: context.logicalTime };
  return transitionResult(next, [{ type: 'MATCH_STARTED', payload: { actorId: command.actorId } }]);
}

function reject(state, code) {
  return transitionResult(state, [], false, { code });
}
