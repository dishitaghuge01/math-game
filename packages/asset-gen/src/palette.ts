import type { DecisionVector } from '@math-game/core-math';

// Palette mapping:
// - morality shifts hue (negative -> warm/reds, positive -> cool/blues)
// - aggression controls saturation
// - curiosity adds a small hue sweep toward green/teal
// - volatility changes lightness variance across the palette
export function paletteFromVector(vector: DecisionVector): string[] {
  const hue = 220 + (vector.morality * 140);
  const saturation = 40 + (vector.aggression * 40);
  const lightnessBase = 45 + (vector.volatility * 20);
  const accentHue = (hue + 40 + vector.curiosity * 80) % 360;

  return [
    `hsl(${hue}, ${saturation}%, ${lightnessBase}%)`,
    `hsl(${accentHue}, ${Math.max(25, saturation - 10)}%, ${Math.min(85, lightnessBase + 15)}%)`,
    `hsl(${(accentHue + 70) % 360}, ${Math.max(30, saturation - 5)}%, ${Math.max(20, lightnessBase - 10)}%)`,
  ];
}
