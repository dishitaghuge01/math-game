import { describe, expect, it } from 'vitest';

import { createInitialVector, TERRAIN_BASE_AMPLITUDE, TERRAIN_BASE_FREQUENCY, terrainAmplitude, terrainFrequency } from '@math-game/core-math';
import { createSimplexNoise2D } from './noise.js';
import { generateHeightmap } from './terrain.js';
import { WaveFunctionCollapse, WfcCollapseError } from './wfc.js';
import { generateDungeonLayout } from './dungeon.js';

describe('world-gen', () => {
  it('createSimplexNoise2D is deterministic and seed-sensitive', () => {
    const first = createSimplexNoise2D(42);
    const second = createSimplexNoise2D(42);
    const firstValue = first(1.2, -0.7);
    const secondValue = second(1.2, -0.7);
    expect(firstValue).toBeCloseTo(secondValue, 12);

    const different = createSimplexNoise2D(43);
    expect(different(1.2, -0.7)).not.toBeCloseTo(firstValue, 8);
  });

  it('createSimplexNoise2D interpolates within a unit cell', () => {
    const noise = createSimplexNoise2D(99);
    const samples = Array.from({ length: 5 }, (_, index) => noise(0.5, 0.2 * index + 0.1));
    const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    const variance = samples.reduce((sum, value) => sum + (value - average) ** 2, 0) / samples.length;
    expect(variance).toBeGreaterThan(1e-4);
  });

  it('generateHeightmap is deterministic and normalized', () => {
    const params = { width: 4, height: 3, riskTolerance: 0.2, volatility: 0.1, curiosity: 0.3 };
    const first = generateHeightmap(123, 4, 3, params);
    const second = generateHeightmap(123, 4, 3, params);
    expect(first).toEqual(second);
    expect(first).toHaveLength(3);
    expect(first[0]).toHaveLength(4);
    for (const row of first) {
      for (const value of row) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it('terrain clipping stays away from hard ceilings at max amplitude', () => {
    const heights = generateHeightmap(321, 6, 6, { width: 6, height: 6, riskTolerance: 1, volatility: 1, curiosity: 0.2 });
    const saturated = heights.flat().filter((value) => value === 1 || value === 0);
    expect(saturated.length / heights.flat().length).toBeLessThan(0.15);
  });

  it('terrainAmplitude and terrainFrequency match the documented formulas', () => {
    expect(terrainAmplitude(0, 0)).toBe(TERRAIN_BASE_AMPLITUDE);
    expect(terrainFrequency(0)).toBe(TERRAIN_BASE_FREQUENCY);
    expect(terrainAmplitude(1, 0)).toBeCloseTo(TERRAIN_BASE_AMPLITUDE + 0.5, 12);
    expect(terrainFrequency(1)).toBeCloseTo(TERRAIN_BASE_FREQUENCY + 0.03, 12);
  });

  it('wave function collapse is deterministic and respects adjacency rules', () => {
    const tileset = [
      { id: 'A', weight: 1 },
      { id: 'B', weight: 1 },
    ];
    const adjacencyRules = {
      A: { north: ['A', 'B'], south: ['A', 'B'], east: ['A'], west: ['A'] },
      B: { north: ['A'], south: ['A'], east: ['B'], west: ['B'] },
    };

    const wfc = new WaveFunctionCollapse(tileset, adjacencyRules, 2, 2);
    const first = wfc.collapse(7);
    const second = wfc.collapse(7);
    expect(first).toEqual(second);

    for (let y = 0; y < 2; y += 1) {
      for (let x = 0; x < 2; x += 1) {
        const current = first[y][x];
        const north = y > 0 ? first[y - 1][x] : null;
        const south = y < 1 ? first[y + 1][x] : null;
        const east = x < 1 ? first[y][x + 1] : null;
        const west = x > 0 ? first[y][x - 1] : null;
        const ruleMap = adjacencyRules[current as keyof typeof adjacencyRules] as Record<string, string[]>;
        const checks = [
          { neighbor: north, direction: 'north' as const },
          { neighbor: south, direction: 'south' as const },
          { neighbor: east, direction: 'east' as const },
          { neighbor: west, direction: 'west' as const },
        ];
        for (const check of checks) {
          if (!check.neighbor) {
            continue;
          }
          expect(ruleMap[check.direction]).toContain(check.neighbor);
        }
      }
    }
  });

  it('wave function collapse throws on unsatisfiable constraints', () => {
    const tileset = [
      { id: 'A', weight: 1 },
      { id: 'B', weight: 1 },
    ];
    const adjacencyRules = {
      A: { north: ['B'], south: ['B'], east: ['B'], west: ['B'] },
      B: { north: [], south: [], east: [], west: [] },
    };

    const wfc = new WaveFunctionCollapse(tileset, adjacencyRules, 2, 2);
    expect(() => wfc.collapse(11)).toThrow(WfcCollapseError);
  });

  it('generateDungeonLayout preserves most requested rooms', () => {
    const vector = createInitialVector();
    vector.riskTolerance = 1;
    vector.aggression = 1;
    vector.socialAffinity = 0.2;
    vector.curiosity = 0.2;

    const survivals = Array.from({ length: 50 }, (_, seed) => {
      const layout = generateDungeonLayout(seed, vector);
      return layout.rooms.length / 9;
    });
    const averageSurvival = survivals.reduce((sum, value) => sum + value, 0) / survivals.length;
    expect(averageSurvival).toBeGreaterThan(0.85);
  });

  it('generateDungeonLayout is deterministic and connected', () => {
    const vector = createInitialVector();
    const first = generateDungeonLayout(99, vector);
    const second = generateDungeonLayout(99, vector);
    expect(first).toEqual(second);

    const roomIds = new Set(first.rooms.map((room) => room.id));
    expect(roomIds.size).toBe(first.rooms.length);
    for (const room of first.rooms) {
      for (const other of first.rooms) {
        if (room.id === other.id) {
          continue;
        }
        const overlap = room.x < other.x + other.w && room.x + room.w > other.x && room.y < other.y + other.h && room.y + room.h > other.y;
        expect(overlap).toBe(false);
      }
    }

    const adjacency = new Map<string, Set<string>>();
    for (const room of first.rooms) {
      adjacency.set(room.id, new Set());
    }
    for (const edge of first.edges) {
      adjacency.get(edge.from)?.add(edge.to);
      adjacency.get(edge.to)?.add(edge.from);
    }
    const visited = new Set<string>();
    const stack = [first.rooms[0].id];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);
      for (const next of adjacency.get(current) ?? []) {
        if (!visited.has(next)) {
          stack.push(next);
        }
      }
    }
    expect(visited.size).toBe(first.rooms.length);
  });
});
