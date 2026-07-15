import { mulberry32, seededChoice, seededRange } from '@math-game/core-math';

export function generateSpriteSVG(seed: number, category: string, palette: string[]): string {
  const rng = mulberry32(seed);
  const fill = seededChoice(rng, palette);
  const accent = seededChoice(rng, palette);
  const size = 32 + Math.round(seededRange(rng, 0, 16));
  const offsetX = Math.round(seededRange(rng, 2, 10));
  const offsetY = Math.round(seededRange(rng, 2, 10));

  if (category === 'item') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect x="2" y="2" width="${size - 4}" height="${size - 4}" rx="6" fill="${fill}" /><circle cx="${size / 2}" cy="${size / 2}" r="${Math.max(4, size / 4)}" fill="${accent}" /></svg>`;
  }

  if (category === 'npc') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${Math.max(6, size / 3)}" fill="${fill}" /><rect x="${offsetX}" y="${offsetY}" width="${Math.max(6, size / 4)}" height="${Math.max(6, size / 4)}" fill="${accent}" /></svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><polygon points="${size / 2},2 ${size - 3},${size - 3} 2,${size - 3}" fill="${fill}" /><rect x="${offsetX}" y="${offsetY}" width="${Math.max(6, size / 4)}" height="${Math.max(6, size / 4)}" fill="${accent}" /></svg>`;
}
