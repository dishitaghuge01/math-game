export const TERRAIN_BASE_AMPLITUDE = 0.4;
export const TERRAIN_RISK_AMPLITUDE_WEIGHT = 0.5;
export const TERRAIN_VOLATILITY_AMPLITUDE_WEIGHT = 0.3;

export const TERRAIN_BASE_FREQUENCY = 0.02;
export const TERRAIN_CURIOSITY_FREQUENCY_WEIGHT = 0.03;

export function terrainAmplitude(riskTolerance: number, volatility: number): number {
  return TERRAIN_BASE_AMPLITUDE + TERRAIN_RISK_AMPLITUDE_WEIGHT * riskTolerance + TERRAIN_VOLATILITY_AMPLITUDE_WEIGHT * volatility;
}

export function terrainFrequency(curiosity: number): number {
  return TERRAIN_BASE_FREQUENCY + TERRAIN_CURIOSITY_FREQUENCY_WEIGHT * curiosity;
}
