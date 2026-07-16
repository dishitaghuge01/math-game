import { randomInt } from 'node:crypto';
import db from '../persistence/db.js';

export type PartyRole = 'fighter' | 'mage' | 'support';

export interface ExpeditionState {
  expeditionId: string;
  worldSeed: number;
  party: Array<{ role: PartyRole; name: string; motive: string; portrait: string }>;
  traits: Record<'mercy' | 'resolve' | 'curiosity' | 'defiance' | 'kinship', { tier: string; recentShift: string }>;
}

const names: Record<PartyRole, string[]> = {
  fighter: ['Aster', 'Bram', 'Cinder'],
  mage: ['Eira', 'Nox', 'Vela'],
  support: ['Iven', 'Mira', 'Sable'],
};
const motives: Record<PartyRole, string[]> = {
  fighter: ['keep the road safe', 'settle an old oath', 'guard the lost'],
  mage: ['read the stars beneath the fog', 'recover a broken theorem', 'name the unnameable'],
  support: ['mend what the expedition breaks', 'bring rivals together', 'preserve a fading song'],
};

export function startExpedition(expeditionId: string, requestedSeed?: number): ExpeditionState {
  const existing = loadExpedition(expeditionId);
  if (existing) return existing;
  const worldSeed = requestedSeed ?? randomInt(1, 2 ** 31 - 1);
  const state: ExpeditionState = {
    expeditionId,
    worldSeed,
    party: (['fighter', 'mage', 'support'] as const).map((role, index) => createPartyMember(role, worldSeed, index)),
    traits: {
      mercy: { tier: 'unwritten', recentShift: 'steady' },
      resolve: { tier: 'unwritten', recentShift: 'steady' },
      curiosity: { tier: 'unwritten', recentShift: 'steady' },
      defiance: { tier: 'unwritten', recentShift: 'steady' },
      kinship: { tier: 'unwritten', recentShift: 'steady' },
    },
  };
  const now = new Date().toISOString();
  db.prepare('INSERT INTO expeditions (expedition_id, state_json, created_at, updated_at) VALUES (?, ?, ?, ?)')
    .run(expeditionId, JSON.stringify(state), now, now);
  return state;
}

export function loadExpedition(expeditionId: string): ExpeditionState | null {
  const row = db.prepare('SELECT state_json FROM expeditions WHERE expedition_id = ?').get(expeditionId) as { state_json: string } | undefined;
  return row ? JSON.parse(row.state_json) as ExpeditionState : null;
}

function createPartyMember(role: PartyRole, seed: number, index: number) {
  const name = names[role][seededIndex(seed, index, names[role].length)];
  const motive = motives[role][seededIndex(seed, index + 7, motives[role].length)];
  return { role, name, motive, portrait: `${role}-sigil-${seededIndex(seed, index + 13, 9)}` };
}

function seededIndex(seed: number, offset: number, length: number): number {
  return Math.abs((seed * 1103515245 + offset * 12345) | 0) % length;
}
