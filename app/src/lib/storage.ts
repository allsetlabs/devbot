/** Generic localStorage cache helpers with safe JSON parsing */

const DRAFT_KEY = 'devbot-chat-draft';

/** Get cached draft text for a given chat */
export function getCachedDraft(chatId: string): string {
  try {
    return localStorage.getItem(`${DRAFT_KEY}:${chatId}`) ?? '';
  } catch {
    return '';
  }
}

/** Cache draft text for a given chat */
export function setCachedDraft(chatId: string, draft: string): void {
  try {
    if (draft) {
      localStorage.setItem(`${DRAFT_KEY}:${chatId}`, draft);
    } else {
      localStorage.removeItem(`${DRAFT_KEY}:${chatId}`);
    }
  } catch {
    // silently ignore
  }
}

/** One-time cleanup: remove old message cache entries that bloat localStorage */
export function cleanupLegacyMessageCaches(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('devbot-chat-messages:')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // silently ignore
  }
}
