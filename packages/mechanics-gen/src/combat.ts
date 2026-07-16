export type CombatAction = 'attack' | 'defend' | 'use-potion';

export interface Combatant {
  name: string;
  health: number;
  maxHealth: number;
  attack: number;
}

export interface CombatState {
  player: Combatant;
  enemy: Combatant;
  potions: number;
  turn: number;
  defending: boolean;
  status: 'active' | 'victory' | 'defeat';
  log: string[];
}

export interface CombatResult {
  state: CombatState;
  events: string[];
}

export function createCombat(enemyName: string, enemyHealth: number, enemyAttack: number): CombatState {
  return {
    player: { name: 'Wayfarer', health: 20, maxHealth: 20, attack: 6 },
    enemy: { name: enemyName, health: enemyHealth, maxHealth: enemyHealth, attack: enemyAttack },
    potions: 2,
    turn: 1,
    defending: false,
    status: 'active',
    log: [`A ${enemyName} blocks the path.`],
  };
}

/** Applies one complete player turn and, if needed, the enemy response. */
export function resolveCombatAction(state: CombatState, action: CombatAction): CombatResult {
  if (state.status !== 'active') return { state, events: [] };

  const next: CombatState = structuredClone(state);
  const events: string[] = [];
  next.defending = false;

  if (action === 'attack') {
    const damage = next.player.attack + deterministicRoll(next.turn, 3);
    next.enemy.health = Math.max(0, next.enemy.health - damage);
    events.push(`You strike ${next.enemy.name} for ${damage}.`);
  } else if (action === 'defend') {
    next.defending = true;
    events.push('You brace for the next blow.');
  } else if (next.potions > 0) {
    next.potions -= 1;
    const healed = Math.min(8, next.player.maxHealth - next.player.health);
    next.player.health += healed;
    events.push(`You drink a potion and recover ${healed} health.`);
  } else {
    events.push('Your satchel holds no potions.');
  }

  if (next.enemy.health === 0) {
    next.status = 'victory';
    events.push(`${next.enemy.name} falls. The way forward is clear.`);
  } else {
    const rawDamage = next.enemy.attack + deterministicRoll(next.turn + 17, 2);
    const damage = next.defending ? Math.max(1, Math.floor(rawDamage / 2)) : rawDamage;
    next.player.health = Math.max(0, next.player.health - damage);
    events.push(`${next.enemy.name} hits you for ${damage}.`);
    if (next.player.health === 0) {
      next.status = 'defeat';
      events.push('You collapse.');
    }
  }

  next.turn += 1;
  next.log = [...next.log, ...events].slice(-8);
  return { state: next, events };
}

function deterministicRoll(turn: number, maximum: number): number {
  return ((turn * 1103515245 + 12345) >>> 0) % (maximum + 1);
}
