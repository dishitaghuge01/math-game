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

  it('rejects travel while a Combat Encounter is active', async () => {
    const expeditionId = `locked-travel-test-${Date.now()}`;
    const started = await fetch(`${baseUrl}/expeditions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expeditionId, worldSeed: 8675309 }) });
    const expedition = await started.json() as { region: { locations: Array<{ id: string; type: string }> } };
    const combatLocation = expedition.region.locations.find((location) => location.type === 'combat')!;
    await fetch(`${baseUrl}/expeditions/${expeditionId}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'travel', destinationId: combatLocation.id }) });

    const response = await fetch(`${baseUrl}/expeditions/${expeditionId}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'travel', destinationId: expedition.region.locations[0].id }) });
    expect(response.status).toBe(400);
    expect((await response.json() as { error: string }).error).toMatch(/combat/i);
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

    let state = afterAction as unknown as { combat: { status: string }; resources: { gold: number; experience: number } };
    for (let turn = 0; turn < 2; turn += 1) {
      const response = await fetch(`${baseUrl}/expeditions/${expeditionId}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'combat', action: 'signature' }) });
      state = await response.json() as typeof state;
    }
    expect(state.combat.status).toBe('victory');
    expect(state.resources).toEqual({ gold: 5, experience: 10, potions: 2 });
  });

  it('applies a Guard shield before the authoritative enemy response', async () => {
    const expeditionId = `shield-test-${Date.now()}`;
    const started = await fetch(`${baseUrl}/expeditions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expeditionId, worldSeed: 7070 }) });
    const state = await started.json() as { region: { locations: Array<{ id: string; type: string }> } };
    const combat = state.region.locations.find((location) => location.type === 'combat')!;
    await fetch(`${baseUrl}/expeditions/${expeditionId}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'travel', destinationId: combat.id }) });
    const response = await fetch(`${baseUrl}/expeditions/${expeditionId}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'combat', action: 'guard' }) });
    const after = await response.json() as { party: Array<{ role: string; health: number; shield: number }> };
    expect(after.party.find((member) => member.role === 'fighter')).toMatchObject({ health: 24, shield: 1 });
  });

  it('uses reported dodge hits to increase the authoritative enemy response', async () => {
    const expeditionId = `dodge-test-${Date.now()}`;
    const started = await fetch(`${baseUrl}/expeditions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expeditionId, worldSeed: 9090 }) });
    const state = await started.json() as { region: { locations: Array<{ id: string; type: string }> } };
    const combat = state.region.locations.find((location) => location.type === 'combat')!;
    await fetch(`${baseUrl}/expeditions/${expeditionId}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'travel', destinationId: combat.id }) });
    const response = await fetch(`${baseUrl}/expeditions/${expeditionId}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'combat', action: 'basic', dodgeHits: 3 }) });
    const after = await response.json() as { party: Array<{ role: string; health: number }> };
    expect(after.party.find((member) => member.role === 'fighter')?.health).toBe(18);
  });

  it('recovers a defeated Party at Camp and persists the deterministic rival advance', async () => {
    const expeditionId = `recovery-test-${Date.now()}`;
    const started = await fetch(`${baseUrl}/expeditions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expeditionId, worldSeed: 8080 }) });
    const state = await started.json() as { region: { locations: Array<{ id: string; type: string }> } };
    const combat = state.region.locations.find((location) => location.type === 'combat')!;
    await fetch(`${baseUrl}/expeditions/${expeditionId}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'travel', destinationId: combat.id }) });
    const retreated = await fetch(`${baseUrl}/expeditions/${expeditionId}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'retreat' }) });
    const recovered = await retreated.json() as { party: Array<{ health: number; maxHealth: number }>; resources: { potions: number }; region: { rivalAdvanced: boolean } };
    expect(recovered.party.every((member) => member.health === member.maxHealth)).toBe(true);
    expect(recovered.resources.potions).toBe(1);
    expect(recovered.region.rivalAdvanced).toBe(true);
    expect(await (await fetch(`${baseUrl}/expeditions/${expeditionId}`)).json()).toMatchObject({ region: { rivalAdvanced: true } });
  });

  it('requires the major decision before resolving the final Encounter into a trait-shaped ending', async () => {
    const expeditionId = `prologue-test-${Date.now()}`;
    const started = await fetch(`${baseUrl}/expeditions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expeditionId, worldSeed: 5150 }) });
    let state = await started.json() as { region: { locations: Array<{ id: string; type: string }> }; ending: unknown };
    const actions = [{ type: 'travel', destinationId: state.region.locations[1].id }, ...Array.from({ length: 3 }, () => ({ type: 'combat', action: 'signature' })), { type: 'travel', destinationId: state.region.locations[2].id }, { type: 'discovery', choice: 'search' }, { type: 'travel', destinationId: state.region.locations[3].id }, { type: 'social', choice: 'share' }, { type: 'travel', destinationId: state.region.locations[4].id }, { type: 'discovery', choice: 'press-on' }, { type: 'travel', destinationId: state.region.locations[5].id }, ...Array.from({ length: 3 }, () => ({ type: 'combat', action: 'signature' })), { type: 'travel', destinationId: state.region.locations[6].id }, ...Array.from({ length: 3 }, () => ({ type: 'combat', action: 'signature' }))];
    for (const action of actions) {
      const response = await fetch(`${baseUrl}/expeditions/${expeditionId}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action) });
      expect(response.status).toBe(200);
      state = await response.json() as typeof state;
    }
    expect(state.ending).toMatchObject({ title: expect.any(String), summary: expect.stringContaining('Kinship') });
  });

  it('exports an action history and imports it as an independent deterministic branch', async () => {
    const expeditionId = `code-test-${Date.now()}`;
    const started = await fetch(`${baseUrl}/expeditions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expeditionId, worldSeed: 424242 }) });
    const initial = await started.json() as { region: { locations: Array<{ id: string; type: string }> } };
    const discovery = initial.region.locations.find((location) => location.type === 'discovery')!;
    const social = initial.region.locations.find((location) => location.type === 'social')!;
    const combat = initial.region.locations.find((location) => location.type === 'combat')!;

    for (const action of [{ type: 'travel', destinationId: combat.id }, { type: 'combat', action: 'signature' }, { type: 'combat', action: 'signature' }, { type: 'combat', action: 'signature' }]) {
      await fetch(`${baseUrl}/expeditions/${expeditionId}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action) });
    }
    for (const action of [{ type: 'travel', destinationId: discovery.id }, { type: 'discovery', choice: 'search' }, { type: 'travel', destinationId: social.id }, { type: 'social', choice: 'share' }]) {
      await fetch(`${baseUrl}/expeditions/${expeditionId}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action) });
    }

    const exported = await fetch(`${baseUrl}/expeditions/${expeditionId}/code`);
    expect(exported.status).toBe(200);
    const { code } = await exported.json() as { code: string };
    const importedResponse = await fetch(`${baseUrl}/expeditions/import`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expeditionId: `${expeditionId}-branch`, code }) });
    expect(importedResponse.status).toBe(201);
    const imported = await importedResponse.json() as { expeditionId: string; worldSeed: number; resources: unknown; traits: unknown; region: unknown };
    const original = await (await fetch(`${baseUrl}/expeditions/${expeditionId}`)).json() as typeof imported;
    expect(imported).toMatchObject({ worldSeed: original.worldSeed, resources: original.resources, traits: original.traits, region: original.region });
    expect(imported.expeditionId).not.toBe(original.expeditionId);
  });
});
