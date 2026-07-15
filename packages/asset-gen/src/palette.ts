import { type DecisionVector, PALETTE_ACCENT_HUE_OFFSET, PALETTE_AGGRESSION_SATURATION_WEIGHT, PALETTE_BASE_HUE, PALETTE_BASE_LIGHTNESS, PALETTE_BASE_SATURATION, PALETTE_CURIOSITY_HUE_SWEEP, PALETTE_HUE_WRAP, PALETTE_LIGHTNESS_DECREMENT, PALETTE_LIGHTNESS_INCREMENT, PALETTE_MAX_LIGHTNESS, PALETTE_MIN_LIGHTNESS, PALETTE_MIN_SATURATION, PALETTE_MORALITY_HUE_WEIGHT, PALETTE_SECOND_ACCENT_HUE_OFFSET, PALETTE_SECOND_MIN_SATURATION, PALETTE_SECOND_SATURATION_DECREMENT, PALETTE_SATURATION_DECREMENT, PALETTE_VOLATILITY_LIGHTNESS_WEIGHT } from '@math-game/core-math';

// Palette mapping:
// - morality shifts hue (negative -> warm/reds, positive -> cool/blues)
// - aggression controls saturation
// - curiosity adds a small hue sweep toward green/teal
// - volatility changes lightness variance across the palette
export function paletteFromVector(vector: DecisionVector): string[] {
  const hue = PALETTE_BASE_HUE + (vector.morality * PALETTE_MORALITY_HUE_WEIGHT);
  const saturation = PALETTE_BASE_SATURATION + (vector.aggression * PALETTE_AGGRESSION_SATURATION_WEIGHT);
  const lightnessBase = PALETTE_BASE_LIGHTNESS + (vector.volatility * PALETTE_VOLATILITY_LIGHTNESS_WEIGHT);
  const accentHue = (hue + PALETTE_ACCENT_HUE_OFFSET + (vector.curiosity * PALETTE_CURIOSITY_HUE_SWEEP)) % PALETTE_HUE_WRAP;

  return [
    `hsl(${hue}, ${saturation}%, ${lightnessBase}%)`,
    `hsl(${accentHue}, ${Math.max(PALETTE_MIN_SATURATION, saturation - PALETTE_SATURATION_DECREMENT)}%, ${Math.min(PALETTE_MAX_LIGHTNESS, lightnessBase + PALETTE_LIGHTNESS_INCREMENT)}%)`,
    `hsl(${(accentHue + PALETTE_SECOND_ACCENT_HUE_OFFSET) % PALETTE_HUE_WRAP}, ${Math.max(PALETTE_SECOND_MIN_SATURATION, saturation - PALETTE_SECOND_SATURATION_DECREMENT)}%, ${Math.max(PALETTE_MIN_LIGHTNESS, lightnessBase - PALETTE_LIGHTNESS_DECREMENT)}%)`,
  ];
}
