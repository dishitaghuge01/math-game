const SESSION_ID_KEY = 'math-game:sessionId';
const USER_ID_KEY = 'math-game:userId';

let cachedSessionId: string | null = null;
let cachedUserId: string | null = null;

function getStorage(): Storage | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  return window.localStorage;
}

function readStoredValue(key: string): string | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }
  return storage.getItem(key);
}

function writeStoredValue(key: string, value: string): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.setItem(key, value);
}

export function getOrCreateClientIds(): { sessionId: string; userId: string } {
  if (cachedSessionId && cachedUserId) {
    return { sessionId: cachedSessionId, userId: cachedUserId };
  }

  const storage = getStorage();
  const existingSessionId = cachedSessionId ?? readStoredValue(SESSION_ID_KEY);
  const existingUserId = cachedUserId ?? readStoredValue(USER_ID_KEY);

  const sessionId = existingSessionId ?? crypto.randomUUID();
  const userId = existingUserId ?? crypto.randomUUID();

  cachedSessionId = sessionId;
  cachedUserId = userId;

  if (storage) {
    if (!existingSessionId) {
      writeStoredValue(SESSION_ID_KEY, sessionId);
    }
    if (!existingUserId) {
      writeStoredValue(USER_ID_KEY, userId);
    }
  }

  return { sessionId, userId };
}
