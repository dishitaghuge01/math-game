const storedMotionPreference = typeof window !== "undefined" ? localStorage.getItem("wayfarer:reduced-motion") : null;
let reducedMotion = storedMotionPreference === "true" || (storedMotionPreference === null && typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

export function toggleReducedMotion() {
  reducedMotion = !reducedMotion;
  if (typeof window !== "undefined") localStorage.setItem("wayfarer:reduced-motion", String(reducedMotion));
  return reducedMotion;
}
export function prefersReducedMotion() { return reducedMotion; }
