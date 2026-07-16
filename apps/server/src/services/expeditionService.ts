import { randomInt } from 'node:crypto';
import db from '../persistence/db.js';

export type PartyRole = 'fighter' | 'mage' | 'support';

export interface RegionLocation {
  id: string;
  name: string;
  type: 'camp' | 'combat' | 'discovery' | 'social' | 'landmark';
  connectedTo: string[];
  revealed: boolean;
  detail?: string;
}

export type ExpeditionAction =
  | { type: 'travel'; destinationId: string }
  | { type: 'combat'; action: 'basic' | 'guard' | 'signature' | 'item'; dodgeHits?: number }
  | { type: 'retreat' }
  | { type: 'discovery'; choice: 'search' | 'press-on' }
  | { type: 'social'; choice: 'share' | 'command' };

export interface SignatureAbility {
  name: string;
  effects: Array<'damage' | 'shield' | 'healing' | 'buff' | 'debuff' | 'turn-manipulation'>;
}

export interface ExpeditionState {
  expeditionId: string;
  worldSeed: number;
  party: Array<{ role: PartyRole; name: string; motive: string; portrait: string; health: number; maxHealth: number; shield: number; abilities: string[]; signatureAbility: SignatureAbility; bond: number }>;
  traits: Record<'mercy' | 'resolve' | 'curiosity' | 'defiance' | 'kinship', { tier: string; recentShift: string }>;
  region: { name: string; currentLocationId: string; campLocationId: string; rivalAdvanced: boolean; locations: RegionLocation[] };
  combat: { status: 'active' | 'victory' | 'defeat'; enemy: { name: string; health: number; maxHealth: number; weakened: number }; activeMemberRole: PartyRole; log: string[] } | null;
  resources: { gold: number; experience: number; potions: number };
  majorDecisionResolved: boolean;
  ending: { title: string; summary: string } | null;
  actionHistory: ExpeditionAction[];
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
    combat: null,
    resources: { gold: 0, experience: 0, potions: 2 },
    majorDecisionResolved: false,
    ending: null,
    actionHistory: [],
  };
  const now = new Date().toISOString();
  db.prepare('INSERT INTO expeditions (expedition_id, state_json, created_at, updated_at) VALUES (?, ?, ?, ?)')
    .run(expeditionId, JSON.stringify(state), now, now);
  return state;
}

export function travelToLocation(expeditionId: string, destinationId: string): ExpeditionState {
  const state = loadExpedition(expeditionId);
  if (!state) throw Object.assign(new Error('Expedition not found'), { status: 404 });
  if (state.combat?.status === 'active') throw Object.assign(new Error('Cannot travel during an active Combat Encounter'), { status: 400 });
  const currentLocation = state.region.locations.find((location) => location.id === state.region.currentLocationId);
  if (currentLocation?.type === 'discovery' || currentLocation?.type === 'social') throw Object.assign(new Error('Resolve the current Encounter before travelling'), { status: 400 });
  const origin = state.region.locations.find((location) => location.id === state.region.currentLocationId);
  const destination = state.region.locations.find((location) => location.id === destinationId);
  if (!origin?.connectedTo.includes(destinationId) || !destination) throw Object.assign(new Error('Destination is not reachable'), { status: 400 });
  state.region.currentLocationId = destinationId;
  destination.revealed = true;
  if (destination.type === 'camp') state.region.campLocationId = destinationId;
  if (destination.type === 'combat') {
    const enemy = createCombatEnemy(state.worldSeed, destination.id);
    state.combat = { status: 'active', enemy: { ...enemy, weakened: 0 }, activeMemberRole: 'fighter', log: [`A ${enemy.name} bars the road.`] };
  }
  for (const neighborId of destination.connectedTo) {
    const neighbor = state.region.locations.find((location) => location.id === neighborId);
    if (neighbor) neighbor.revealed = true;
  }
  recordAction(state, { type: 'travel', destinationId });
  saveExpedition(state);
  return state;
}

export function resolveSocial(expeditionId: string, choice: 'share' | 'command'): ExpeditionState {
  const state = loadExpedition(expeditionId);
  if (!state) throw Object.assign(new Error('Expedition not found'), { status: 404 });
  const location = state.region.locations.find((entry) => entry.id === state.region.currentLocationId);
  if (location?.type !== 'social') throw Object.assign(new Error('No Social Encounter at this location'), { status: 400 });
  if (choice === 'share') {
    state.traits.kinship = { tier: 'gathering', recentShift: 'rising' };
    state.party.forEach((member) => { member.bond += 1; });
  } else {
    state.traits.defiance = { tier: 'kindling', recentShift: 'rising' };
    state.party.forEach((member) => { member.bond = Math.max(-3, member.bond - 1); });
  }
  location.type = 'landmark';
  recordAction(state, { type: 'social', choice });
  saveExpedition(state);
  return state;
}

export function resolveDiscovery(expeditionId: string, choice: 'search' | 'press-on'): ExpeditionState {
  const state = loadExpedition(expeditionId);
  if (!state) throw Object.assign(new Error('Expedition not found'), { status: 404 });
  const location = state.region.locations.find((entry) => entry.id === state.region.currentLocationId);
  if (location?.type !== 'discovery') throw Object.assign(new Error('No Discovery Encounter at this location'), { status: 400 });
  if (choice === 'search') {
    state.resources.gold += 3;
    state.traits.curiosity = { tier: 'awakening', recentShift: 'rising' };
  } else {
    state.traits.resolve = { tier: 'steadfast', recentShift: 'rising' };
  }
  if (location.name === 'The Splintered Observatory') state.majorDecisionResolved = true;
  location.type = 'landmark';
  recordAction(state, { type: 'discovery', choice });
  saveExpedition(state);
  return state;
}

export function retreatToCamp(expeditionId: string): ExpeditionState {
  const state = loadExpedition(expeditionId);
  if (!state) throw Object.assign(new Error('Expedition not found'), { status: 404 });
  if (!state.combat || state.combat.status !== 'active') throw Object.assign(new Error('No active Combat Encounter'), { status: 400 });
  state.combat.status = 'defeat';
  state.combat.log.push('The Party retreats to Camp.');
  state.region.currentLocationId = state.region.campLocationId;
  state.resources.gold = Math.max(0, state.resources.gold - 2);
  state.resources.potions = Math.max(0, state.resources.potions - 1);
  state.region.rivalAdvanced = true;
  const blocked = state.region.locations.find((location) => location.type === 'landmark');
  if (blocked) blocked.revealed = false;
  recoverPartyAtCamp(state);
  recordAction(state, { type: 'retreat' });
  saveExpedition(state);
  return state;
}

export function resolveCombatAction(expeditionId: string, action: 'basic' | 'guard' | 'signature' | 'item', dodgeHits = 0): ExpeditionState {
  const state = loadExpedition(expeditionId);
  if (!state) throw Object.assign(new Error('Expedition not found'), { status: 404 });
  if (!state.combat || state.combat.status !== 'active') throw Object.assign(new Error('No active Combat Encounter'), { status: 400 });
  const actingRole = state.combat.activeMemberRole;
  const actor = state.party.find((member) => member.role === actingRole)!;
  const signatureDamage: Record<PartyRole, number> = { fighter: 6, mage: 8, support: 4 };
  if (action === 'item' && state.resources.potions === 0) throw Object.assign(new Error('No potions remain'), { status: 400 });
  if (action === 'guard') actor.shield += 2;
  const damage = action === 'signature' && actor.signatureAbility.effects.includes('damage') ? signatureDamage[actingRole] : action === 'basic' ? 4 : action === 'guard' ? 1 : 0;
  if (action === 'item') {
    state.resources.potions -= 1;
    actor.health = Math.min(actor.maxHealth, actor.health + 7);
    state.combat.log.push(`${actor.name} drinks a potion and recovers 7 health.`);
  }
  if (action === 'signature' && actor.signatureAbility.effects.includes('healing')) {
    const wounded = state.party.find((member) => member.health < member.maxHealth) ?? actor;
    wounded.health = Math.min(wounded.maxHealth, wounded.health + 5);
  }
  if (action === 'signature' && actor.signatureAbility.effects.includes('buff')) actor.shield += 1;
  if (action === 'signature' && actor.signatureAbility.effects.includes('debuff')) state.combat.enemy.weakened = 1;
  state.combat.enemy.health = Math.max(0, state.combat.enemy.health - damage);
  state.combat.log.push(`${actingRole} uses ${action} for ${damage} damage.`);
  if (state.combat.enemy.health === 0) {
    state.combat.status = 'victory';
    state.resources.gold += 5;
    state.resources.experience += 10;
    const clearedLocation = state.region.locations.find((location) => location.id === state.region.currentLocationId);
    if (clearedLocation) clearedLocation.type = 'landmark';
    state.combat.log.push('The road is clear. The Party claims 5 gold and 10 experience.');
    if (clearedLocation?.id === state.region.locations.at(-1)?.id && state.majorDecisionResolved) {
      state.ending = createEnding(state);
      state.combat.log.push(state.ending.summary);
    }
  } else {
    const target = state.party.find((member) => member.role === actingRole)!;
    const baseDamage = action === 'guard' ? 1 : action === 'item' ? 2 : 3;
    const incomingDamage = Math.max(0, baseDamage + Math.max(0, Math.floor(dodgeHits)) - state.combat.enemy.weakened);
    state.combat.enemy.weakened = 0;
    const absorbed = Math.min(target.shield, incomingDamage);
    target.shield -= absorbed;
    const damageTaken = incomingDamage - absorbed;
    target.health = Math.max(0, target.health - damageTaken);
    state.combat.log.push(`${state.combat.enemy.name} strikes ${target.name} for ${damageTaken} damage after ${dodgeHits} dodge hits${absorbed ? `; shield absorbs ${absorbed}` : ''}.`);
    if (state.party.every((member) => member.health === 0)) {
      state.combat.status = 'defeat';
      state.combat.log.push('The Party falls and returns to Camp.');
      state.region.currentLocationId = state.region.campLocationId;
      state.resources.potions = Math.max(0, state.resources.potions - 1);
      state.region.rivalAdvanced = true;
      recoverPartyAtCamp(state);
    }
    const roles: PartyRole[] = ['fighter', 'mage', 'support'];
    state.combat.activeMemberRole = roles[(roles.indexOf(actingRole) + 1) % roles.length];
  }
  recordAction(state, { type: 'combat', action, dodgeHits });
  saveExpedition(state);
  return state;
}

export function applyExpeditionAction(expeditionId: string, action: ExpeditionAction): ExpeditionState {
  switch (action.type) {
    case 'travel': return travelToLocation(expeditionId, action.destinationId);
    case 'combat': return resolveCombatAction(expeditionId, action.action, action.dodgeHits);
    case 'retreat': return retreatToCamp(expeditionId);
    case 'discovery': return resolveDiscovery(expeditionId, action.choice);
    case 'social': return resolveSocial(expeditionId, action.choice);
  }
}

export function exportExpeditionCode(expeditionId: string): string {
  const state = loadExpedition(expeditionId);
  if (!state) throw Object.assign(new Error('Expedition not found'), { status: 404 });
  return Buffer.from(JSON.stringify({ worldSeed: state.worldSeed, actions: state.actionHistory ?? [] })).toString('base64url');
}

export function importExpeditionCode(expeditionId: string, code: string): ExpeditionState {
  let replay: { worldSeed: number; actions: ExpeditionAction[] };
  try {
    replay = JSON.parse(Buffer.from(code, 'base64url').toString('utf8')) as typeof replay;
  } catch {
    throw Object.assign(new Error('Invalid Expedition Code'), { status: 400 });
  }
  if (!Number.isInteger(replay.worldSeed) || replay.worldSeed < 1 || !Array.isArray(replay.actions) || !replay.actions.every(isExpeditionAction)) {
    throw Object.assign(new Error('Invalid Expedition Code'), { status: 400 });
  }
  if (loadExpedition(expeditionId)) throw Object.assign(new Error('Expedition already exists'), { status: 409 });
  startExpedition(expeditionId, replay.worldSeed);
  for (const action of replay.actions) applyExpeditionAction(expeditionId, action);
  return loadExpedition(expeditionId)!;
}

export function loadExpedition(expeditionId: string): ExpeditionState | null {
  const row = db.prepare('SELECT state_json FROM expeditions WHERE expedition_id = ?').get(expeditionId) as { state_json: string } | undefined;
  return row ? JSON.parse(row.state_json) as ExpeditionState : null;
}

export function isExpeditionAction(action: unknown): action is ExpeditionAction {
  if (!action || typeof action !== 'object' || !('type' in action)) return false;
  const value = action as Record<string, unknown>;
  return (value.type === 'travel' && typeof value.destinationId === 'string')
    || (value.type === 'combat' && (value.action === 'basic' || value.action === 'guard' || value.action === 'signature' || value.action === 'item') && (value.dodgeHits === undefined || (typeof value.dodgeHits === 'number' && Number.isInteger(value.dodgeHits) && value.dodgeHits >= 0)))
    || value.type === 'retreat'
    || (value.type === 'discovery' && (value.choice === 'search' || value.choice === 'press-on'))
    || (value.type === 'social' && (value.choice === 'share' || value.choice === 'command'));
}

function recordAction(state: ExpeditionState, action: ExpeditionAction): void {
  state.actionHistory ??= [];
  state.actionHistory.push(action);
}

function saveExpedition(state: ExpeditionState): void {
  db.prepare('UPDATE expeditions SET state_json = ?, updated_at = ? WHERE expedition_id = ?')
    .run(JSON.stringify(state), new Date().toISOString(), state.expeditionId);
}

function createRegion(seed: number): ExpeditionState['region'] {
  const templates: Array<Pick<RegionLocation, 'name' | 'type'>> = [
    { name: 'Hearth of Reeds', type: 'camp' }, { name: 'Gloam Bridge', type: 'combat' }, { name: 'The Listening Well', type: 'discovery' },
    { name: 'Pilgrim Lanterns', type: 'social' }, { name: 'The Splintered Observatory', type: 'discovery' }, { name: 'Rookery of Ash', type: 'combat' }, { name: 'Moorheart Gate', type: 'combat' },
  ];
  const discoveryDetails = ['The water reflects a road that does not yet exist.', 'Reeds spell a warning in a script only the Mage can read.', 'A buried bell answers the Party before anyone touches it.'];
  const socialDetails = ['The distant lanterns split the Party. Who carries the burden?', 'A pilgrim offers shelter, but asks the Party to leave a promise behind.', 'A rival scout waits beside the road with an offer no one trusts.'];
  const locations = templates.map((template, index) => ({
    ...template,
    detail: template.type === 'discovery' ? discoveryDetails[seededIndex(seed, index, discoveryDetails.length)] : template.type === 'social' ? socialDetails[seededIndex(seed, index, socialDetails.length)] : undefined,
    id: `moor-${seed}-${index}`,
    connectedTo: [] as string[],
    revealed: index === 0 || index === 1,
  }));
  for (let index = 0; index < locations.length - 1; index += 1) {
    locations[index].connectedTo.push(locations[index + 1].id);
    locations[index + 1].connectedTo.push(locations[index].id);
  }
  return { name: 'The Fogbound Moor', currentLocationId: locations[0].id, campLocationId: locations[0].id, rivalAdvanced: false, locations };
}

function createCombatEnemy(seed: number, locationId: string): { name: string; health: number; maxHealth: number } {
  const variants = [
    { name: 'Fogbound Revenant', health: 18 },
    { name: 'Moorlight Wisp', health: 14 },
    { name: 'Ashen Rook', health: 22 },
  ];
  const locationOffset = [...locationId].reduce((total, character) => total + character.charCodeAt(0), 0);
  const variant = variants[seededIndex(seed, locationOffset, variants.length)];
  return { name: variant.name, health: variant.health, maxHealth: variant.health };
}

function recoverPartyAtCamp(state: ExpeditionState): void {
  state.party.forEach((member) => { member.health = member.maxHealth; });
}

function createEnding(state: ExpeditionState): { title: string; summary: string } {
  const kinship = state.traits.kinship.tier;
  const bonds = state.party.reduce((total, member) => total + member.bond, 0);
  return bonds > 0
    ? { title: 'A Shared Lantern', summary: `Kinship ${kinship} carries the Party beyond the Moor, their bonds bright against the fog.` }
    : { title: 'The Road Kept', summary: `Kinship ${kinship} marks a hard-won passage beyond the Moor.` };
}

function createPartyMember(role: PartyRole, seed: number, index: number) {
  const name = names[role][seededIndex(seed, index, names[role].length)];
  const motive = motives[role][seededIndex(seed, index + 7, motives[role].length)];
  const maxHealth = role === 'fighter' ? 24 : role === 'mage' ? 16 : 20;
  const abilityStem = names[role][seededIndex(seed, index + 19, names[role].length)];
  const effects: Record<PartyRole, SignatureAbility['effects']> = {
    fighter: ['damage', 'shield'], mage: ['damage', 'debuff'], support: ['damage', 'healing', 'buff'],
  };
  const signatureAbility = { name: `${abilityStem}'s signature`, effects: effects[role] };
  return { role, name, motive, portrait: `${role}-sigil-${seededIndex(seed, index + 13, 9)}`, health: maxHealth, maxHealth, shield: 0, bond: 0, abilities: [`${abilityStem}'s strike`, `${abilityStem}'s guard`, signatureAbility.name], signatureAbility };
}

function seededIndex(seed: number, offset: number, length: number): number {
  return Math.abs((seed * 1103515245 + offset * 12345) | 0) % length;
}
