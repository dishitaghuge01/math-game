import { deriveSeed } from '@math-game/core-math';
import { createCombat, enemyStatsFor, resolveCombatAction, type CombatAction, type CombatState } from '@math-game/mechanics-gen';
import { generateHeightmap } from '@math-game/world-gen';

import * as sessionStore from './sessionStore.js';

const MAP_SIZE = 12;
const START = { row: 6, col: 6 };

export interface RpgGameState {
  grid: number[][];
  revealed: boolean[][];
  position: { row: number; col: number };
  gold: number;
  experience: number;
  combat: CombatState | null;
  log: string[];
}

type Direction = 'north' | 'south' | 'east' | 'west';
type GameAction = { type: 'move'; direction: Direction } | { type: 'combat'; action: CombatAction } | { type: 'reset' };

const games = new Map<string, RpgGameState>();

export function getRpgGame(sessionId: string): RpgGameState {
  const existing = games.get(sessionId);
  if (existing) return existing;

  const session = sessionStore.getOrCreateSession(sessionId, sessionId);
  const seed = deriveSeed(session.vector, sessionId, 'rpg:map');
  const heights = generateHeightmap(seed, MAP_SIZE, MAP_SIZE, {
    width: MAP_SIZE,
    height: MAP_SIZE,
    riskTolerance: session.vector.riskTolerance,
    volatility: session.vector.volatility,
    curiosity: session.vector.curiosity,
  });
  const game: RpgGameState = {
    grid: heights.map((row) => row.map(quantizeHeight)),
    revealed: Array.from({ length: MAP_SIZE }, () => Array(MAP_SIZE).fill(false)),
    position: { ...START },
    gold: 0,
    experience: 0,
    combat: null,
    log: ['You arrive at the edge of the moor.'],
  };
  revealAround(game);
  games.set(sessionId, game);
  return game;
}

export function applyGameAction(sessionId: string, action: GameAction): RpgGameState {
  if (action.type === 'reset') {
    games.delete(sessionId);
    return getRpgGame(sessionId);
  }

  const game = getRpgGame(sessionId);
  if (action.type === 'combat') return performCombat(game, action.action);
  return move(game, action.direction, sessionId);
}

function move(game: RpgGameState, direction: Direction, sessionId: string): RpgGameState {
  if (game.combat?.status === 'active') return withLog(game, 'Defeat your foe before moving on.');
  const offsets: Record<Direction, { row: number; col: number }> = {
    north: { row: -1, col: 0 }, south: { row: 1, col: 0 }, east: { row: 0, col: 1 }, west: { row: 0, col: -1 },
  };
  const next = { row: game.position.row + offsets[direction].row, col: game.position.col + offsets[direction].col };
  if (next.row < 0 || next.col < 0 || next.row >= MAP_SIZE || next.col >= MAP_SIZE) {
    return withLog(game, 'The wilds beyond this boundary are not charted yet.');
  }

  game.position = next;
  revealAround(game);
  game.log = [...game.log, `You travel ${direction}.`].slice(-8);
  if (isEncounterTile(next, sessionId)) {
    const session = sessionStore.getOrCreateSession(sessionId, sessionId);
    const stats = enemyStatsFor(session.vector, 1);
    game.combat = createCombat('Moor wolf', Math.max(8, stats.health), Math.max(2, Math.ceil(stats.health / 4)));
    game.log = [...game.log, 'A moor wolf leaps from the fog!'].slice(-8);
  }
  return game;
}

function performCombat(game: RpgGameState, action: CombatAction): RpgGameState {
  if (!game.combat || game.combat.status !== 'active') return withLog(game, 'There is no foe to fight.');
  const result = resolveCombatAction(game.combat, action);
  game.combat = result.state;
  game.log = [...game.log, ...result.events].slice(-8);
  if (result.state.status === 'victory') {
    game.gold += 5;
    game.experience += 10;
    game.log = [...game.log, 'You claim 5 gold and 10 experience.'].slice(-8);
  }
  return game;
}

function revealAround(game: RpgGameState): void {
  for (let row = game.position.row - 1; row <= game.position.row + 1; row += 1) {
    for (let col = game.position.col - 1; col <= game.position.col + 1; col += 1) {
      if (row >= 0 && col >= 0 && row < MAP_SIZE && col < MAP_SIZE) game.revealed[row][col] = true;
    }
  }
}

function isEncounterTile(position: { row: number; col: number }, sessionId: string): boolean {
  if (position.row === START.row && position.col === START.col) return false;
  return (position.row * 7 + position.col * 11 + sessionId.length) % 5 === 0;
}

function withLog(game: RpgGameState, line: string): RpgGameState {
  game.log = [...game.log, line].slice(-8);
  return game;
}

function quantizeHeight(value: number): number {
  if (value < 0.25) return 0;
  if (value < 0.5) return 1;
  if (value < 0.75) return 2;
  return 3;
}
