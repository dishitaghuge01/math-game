import { randomInt } from 'node:crypto';
import db from '../persistence/db.js';

export type PartyRole = 'fighter' | 'mage' | 'support';

export interface RegionLocation {
  id: string;
  name: string;
  type: 'camp' | 'combat' | 'discovery' | 'social' | 'landmark';
  connectedTo: string[];
  revealed: boolean;
}

export interface ExpeditionState {
  expeditionId: string;
  worldSeed: number;
  party: Array<{ role: PartyRole; name: string; motive: string; portrait: string }>;
  traits: Record<'mercy' | 'resolve' | 'curiosity' | 'defiance' | 'kinship', { tier: string; recentShift: string }>;
  region: { name: string; currentLocationId: string; locations: RegionLocation[] };
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
    region: createRegion(worldSeed),
  };
  const now = new Date().toISOString();
  db.prepare('INSERT INTO expeditions (expedition_id, state_json, created_at, updated_at) VALUES (?, ?, ?, ?)')
    .run(expeditionId, JSON.stringify(state), now, now);
  return state;
}

export function travelToLocation(expeditionId: string, destinationId: string): ExpeditionState {
  const state = loadExpedition(expeditionId);
  if (!state) throw Object.assign(new Error('Expedition not found'), { status: 404 });
  const origin = state.region.locations.find((location) => location.id === state.region.currentLocationId);
  const destination = state.region.locations.find((location) => location.id === destinationId);
  if (!origin?.connectedTo.includes(destinationId) || !destination) throw Object.assign(new Error('Destination is not reachable'), { status: 400 });
  state.region.currentLocationId = destinationId;
  destination.revealed = true;
  for (const neighborId of destination.connectedTo) {
    const neighbor = state.region.locations.find((location) => location.id === neighborId);
    if (neighbor) neighbor.revealed = true;
  }
  saveExpedition(state);
  return state;
}

export function loadExpedition(expeditionId: string): ExpeditionState | null {
  const row = db.prepare('SELECT state_json FROM expeditions WHERE expedition_id = ?').get(expeditionId) as { state_json: string } | undefined;
  return row ? JSON.parse(row.state_json) as ExpeditionState : null;
}

function saveExpedition(state: ExpeditionState): void {
  db.prepare('UPDATE expeditions SET state_json = ?, updated_at = ? WHERE expedition_id = ?')
    .run(JSON.stringify(state), new Date().toISOString(), state.expeditionId);
}

function createRegion(seed: number): ExpeditionState['region'] {
  const templates: Array<Pick<RegionLocation, 'name' | 'type'>> = [
    { name: 'Hearth of Reeds', type: 'camp' }, { name: 'Gloam Bridge', type: 'combat' }, { name: 'The Listening Well', type: 'discovery' },
    { name: 'Pilgrim Lanterns', type: 'social' }, { name: 'The Splintered Observatory', type: 'landmark' }, { name: 'Moorheart Gate', type: 'combat' },
  ];
  const locations = templates.map((template, index) => ({
    ...template,
    id: `moor-${seed}-${index}`,
    connectedTo: [] as string[],
    revealed: index === 0 || index === 1,
  }));
  for (let index = 0; index < locations.length - 1; index += 1) {
    locations[index].connectedTo.push(locations[index + 1].id);
    locations[index + 1].connectedTo.push(locations[index].id);
  }
  return { name: 'The Fogbound Moor', currentLocationId: locations[0].id, locations };
}

function createPartyMember(role: PartyRole, seed: number, index: number) {
  const name = names[role][seededIndex(seed, index, names[role].length)];
  const motive = motives[role][seededIndex(seed, index + 7, motives[role].length)];
  return { role, name, motive, portrait: `${role}-sigil-${seededIndex(seed, index + 13, 9)}` };
}

function seededIndex(seed: number, offset: number, length: number): number {
  return Math.abs((seed * 1103515245 + offset * 12345) | 0) % length;
}
