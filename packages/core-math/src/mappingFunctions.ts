export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function softmax(scores: number[]): number[] {
  if (scores.length === 0) {
    return [];
  }

  const maxScore = Math.max(...scores);
  const exps = scores.map((score) => Math.exp(score - maxScore));
  const sum = exps.reduce((total, value) => total + value, 0);

  return exps.map((value) => value / sum);
}

export function dotProduct(weights: Partial<Record<string, number>>, vector: Record<string, number>): number {
  return Object.entries(weights).reduce((sum, [key, weight]) => sum + (weight ?? 0) * (vector[key] ?? 0), 0);
}
