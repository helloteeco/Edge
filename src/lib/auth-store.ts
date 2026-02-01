// Shared token store for magic link authentication
// In production, replace with Redis or database storage

interface TokenData {
  email: string;
  expiresAt: number;
}

// Global token store (persists across API routes in the same process)
const globalTokenStore = new Map<string, TokenData>();

export function setToken(token: string, email: string, expiresInMs: number = 15 * 60 * 1000) {
  globalTokenStore.set(token, {
    email: email.toLowerCase(),
    expiresAt: Date.now() + expiresInMs,
  });
}

export function getToken(token: string): TokenData | undefined {
  return globalTokenStore.get(token);
}

export function deleteToken(token: string): boolean {
  return globalTokenStore.delete(token);
}

export function cleanupExpiredTokens() {
  const now = Date.now();
  const entries = Array.from(globalTokenStore.entries());
  for (const [token, data] of entries) {
    if (data.expiresAt < now) {
      globalTokenStore.delete(token);
    }
  }
}

export function getStoreSize(): number {
  return globalTokenStore.size;
}
