let reducedMotion = typeof window !== "undefined" && localStorage.getItem("wayfarer:reduced-motion") === "true";

export function toggleReducedMotion() {
  reducedMotion = !reducedMotion;
  if (typeof window !== "undefined") localStorage.setItem("wayfarer:reduced-motion", String(reducedMotion));
  return reducedMotion;
}
export function prefersReducedMotion() { return reducedMotion; }
