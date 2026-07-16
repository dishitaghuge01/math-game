let reducedMotion = false;

export function toggleReducedMotion() { reducedMotion = !reducedMotion; return reducedMotion; }
export function prefersReducedMotion() { return reducedMotion; }
