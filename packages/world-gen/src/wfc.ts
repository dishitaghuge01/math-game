import { mulberry32, seededChoice, seededRange } from '../../core-math/src/prng.js';

export interface Tile {
  id: string;
  weight: number;
}

export type Direction = 'north' | 'south' | 'east' | 'west';
export type AdjacencyRules = Record<string, Record<Direction, string[]>>;

export type Grid = string[][];

export class WaveFunctionCollapse {
  private readonly tileset: Tile[];
  private readonly adjacencyRules: AdjacencyRules;
  private readonly width: number;
  private readonly height: number;

  constructor(tileset: Tile[], adjacencyRules: AdjacencyRules, width: number, height: number) {
    this.tileset = tileset;
    this.adjacencyRules = adjacencyRules;
    this.width = width;
    this.height = height;
  }

  collapse(seed: number): Grid {
    const rng = mulberry32(seed);
    const possibilities: string[][][] = Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => this.tileset.map((tile) => tile.id)),
    );
    const grid: Grid = Array.from({ length: this.height }, () => Array.from({ length: this.width }, () => ''));

    const solved = this.search(rng, possibilities, grid);
    return solved ?? this.fallbackGrid();
  }

  private search(rng: () => number, possibilities: string[][][], grid: Grid): Grid | null {
    const nextCell = this.findLowestEntropyCell(possibilities);
    if (!nextCell) {
      return grid.map((row) => row.map((cell) => cell || this.tileset[0].id));
    }

    const { x, y } = nextCell;
    const options = possibilities[y][x];
    if (options.length === 0) {
      return null;
    }

    const orderedOptions = options.slice().sort((left, right) => {
      const leftWeight = this.tileset.find((tile) => tile.id === left)?.weight ?? 0;
      const rightWeight = this.tileset.find((tile) => tile.id === right)?.weight ?? 0;
      return rightWeight - leftWeight;
    });

    const shuffledOptions = orderedOptions.slice();
    for (let index = shuffledOptions.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(seededRange(rng, 0, index + 1));
      [shuffledOptions[index], shuffledOptions[swapIndex]] = [shuffledOptions[swapIndex], shuffledOptions[index]];
    }

    for (const tileId of shuffledOptions) {
      const nextPossibilities = possibilities.map((row) => row.map((cell) => [...cell]));
      const nextGrid = grid.map((row) => [...row]);
      nextPossibilities[y][x] = [tileId];
      nextGrid[y][x] = tileId;

      if (this.propagate(nextPossibilities, nextGrid, x, y, tileId)) {
        const solved = this.search(rng, nextPossibilities, nextGrid);
        if (solved) {
          return solved;
        }
      }
    }

    return null;
  }

  private propagate(possibilities: string[][][], grid: Grid, x: number, y: number, chosenTileId: string): boolean {
    const queue: Array<[number, number]> = [[x, y]];
    while (queue.length > 0) {
      const [cx, cy] = queue.shift()!;
      const currentOptions = possibilities[cy][cx];
      if (currentOptions.length === 0) {
        return false;
      }

      if (currentOptions.length !== 1) {
        continue;
      }

      const currentTileId = currentOptions[0];
      const neighbors = [
        { x: cx, y: cy - 1, direction: 'north' as const },
        { x: cx, y: cy + 1, direction: 'south' as const },
        { x: cx + 1, y: cy, direction: 'east' as const },
        { x: cx - 1, y: cy, direction: 'west' as const },
      ];

      for (const neighbor of neighbors) {
        if (neighbor.x < 0 || neighbor.x >= this.width || neighbor.y < 0 || neighbor.y >= this.height) {
          continue;
        }

        const allowed = this.adjacencyRules[currentTileId]?.[neighbor.direction] ?? [];
        const currentNeighborOptions = possibilities[neighbor.y][neighbor.x];
        const nextOptions = currentNeighborOptions.filter((candidate) => allowed.includes(candidate));
        if (nextOptions.length === 0) {
          return false;
        }

        if (nextOptions.length !== currentNeighborOptions.length) {
          possibilities[neighbor.y][neighbor.x] = nextOptions;
          if (nextOptions.length === 1) {
            grid[neighbor.y][neighbor.x] = nextOptions[0];
          }
          queue.push([neighbor.x, neighbor.y]);
        }
      }
    }

    return true;
  }

  private findLowestEntropyCell(possibilities: string[][][]): { x: number; y: number } | null {
    let best: { x: number; y: number } | null = null;
    let bestEntropy = Number.POSITIVE_INFINITY;

    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const options = possibilities[y][x];
        if (options.length === 1) {
          continue;
        }
        const entropy = options.length;
        if (entropy < bestEntropy) {
          bestEntropy = entropy;
          best = { x, y };
        }
      }
    }

    return best;
  }

  private fallbackGrid(): Grid {
    return Array.from({ length: this.height }, (_, y) =>
      Array.from({ length: this.width }, (_, x) => this.tileset[0].id),
    );
  }
}
