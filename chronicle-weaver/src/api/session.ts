const SESSION_KEY = "math-game:sessionId";
const USER_KEY = "math-game:userId";

let cached: { sessionId: string; userId: string } | null = null;

export function getOrCreateClientIds(): { sessionId: string; userId: string } {
  if (cached) return cached;
  if (typeof window === "undefined") {
    // SSR safety fallback — not used in this SPA
    return { sessionId: "ssr", userId: "ssr" };
  }
  let sessionId = localStorage.getItem(SESSION_KEY);
  let userId = localStorage.getItem(USER_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem(USER_KEY, userId);
  }
  cached = { sessionId, userId };
  return cached;
}

export function resetClientIds() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(USER_KEY);
  cached = null;
}
