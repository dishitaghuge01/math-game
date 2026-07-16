import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { createApp } from './app.js';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP server');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

describe('Expedition API', () => {
  it('starts and resumes a seeded Expedition with a generated three-member Party', async () => {
    const expeditionId = `expedition-test-${Date.now()}`;
    const started = await fetch(`${baseUrl}/expeditions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expeditionId, worldSeed: 104729 }),
    });

    expect(started.status).toBe(201);
    const expedition = await started.json() as {
      worldSeed: number;
      party: Array<{ role: string; name: string; motive: string; portrait: string }>;
      traits: Record<string, { tier: string; recentShift: string }>;
    };
    expect(expedition.worldSeed).toBe(104729);
    expect(expedition.party.map((member) => member.role)).toEqual(['fighter', 'mage', 'support']);
    expect(expedition.party.every((member) => member.name && member.motive && member.portrait)).toBe(true);
    expect(Object.keys(expedition.traits)).toEqual(['mercy', 'resolve', 'curiosity', 'defiance', 'kinship']);

    const resumed = await fetch(`${baseUrl}/expeditions/${expeditionId}`);
    expect(resumed.status).toBe(200);
    expect(await resumed.json()).toEqual(expedition);
  });

  it('travels between connected generated Region locations and persists the revealed destination', async () => {
    const expeditionId = `region-test-${Date.now()}`;
    const started = await fetch(`${baseUrl}/expeditions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expeditionId, worldSeed: 271828 }),
    });
    const expedition = await started.json() as { region: { currentLocationId: string; locations: Array<{ id: string; connectedTo: string[]; revealed: boolean }> } };
    const origin = expedition.region.locations.find((location) => location.id === expedition.region.currentLocationId)!;
    const destinationId = origin.connectedTo[0];

    const travelled = await fetch(`${baseUrl}/expeditions/${expeditionId}/actions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'travel', destinationId }),
    });
    expect(travelled.status).toBe(200);
    const next = await travelled.json() as typeof expedition;
    expect(next.region.currentLocationId).toBe(destinationId);
    expect(next.region.locations.find((location) => location.id === destinationId)?.revealed).toBe(true);

    const resumed = await fetch(`${baseUrl}/expeditions/${expeditionId}`);
    expect(await resumed.json()).toEqual(next);
  });

  it('opens a three-member Combat Encounter and resolves a party action', async () => {
    const expeditionId = `combat-test-${Date.now()}`;
    const started = await fetch(`${baseUrl}/expeditions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expeditionId, worldSeed: 314159 }) });
    const expedition = await started.json() as { region: { locations: Array<{ id: string; type: string }> } };
    const combatLocation = expedition.region.locations.find((location) => location.type === 'combat')!;
    const travelled = await fetch(`${baseUrl}/expeditions/${expeditionId}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'travel', destinationId: combatLocation.id }) });
    const inCombat = await travelled.json() as { combat: { status: string; enemy: { health: number }; activeMemberRole: string } };
    expect(inCombat.combat.status).toBe('active');
    expect(inCombat.combat.activeMemberRole).toBe('fighter');

    const acted = await fetch(`${baseUrl}/expeditions/${expeditionId}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'combat', action: 'signature' }) });
    expect(acted.status).toBe(200);
    const afterAction = await acted.json() as { combat: { enemy: { health: number }; log: string[]; activeMemberRole: string }; party: Array<{ role: string; health: number; maxHealth: number; abilities: string[] }> };
    expect(afterAction.combat.enemy.health).toBeLessThan(inCombat.combat.enemy.health);
    expect(afterAction.combat.activeMemberRole).toBe('mage');
    expect(afterAction.party.every((member) => member.health <= member.maxHealth && member.abilities.length === 3)).toBe(true);
    expect(afterAction.party.find((member) => member.role === 'fighter')?.health).toBeLessThan(24);
    expect(afterAction.combat.log.length).toBeGreaterThan(1);
  });
});
