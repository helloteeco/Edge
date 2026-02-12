/**
 * Account-specific localStorage helpers.
 * 
 * Markets (savedCities, savedStates) are stored per-account using email-prefixed keys.
 * When no user is logged in, these return empty arrays.
 * 
 * Recent Searches (edge_recent_searches) remain shared across accounts on the same
 * device to avoid wasting API credits for the same property data.
 */

/** Get the currently logged-in user's email, or null */
export function getAuthEmail(): string | null {
  if (typeof window === 'undefined') return null;
  const authEmail = localStorage.getItem("edge_auth_email");
  const authToken = localStorage.getItem("edge_auth_token");
  const authExpiry = localStorage.getItem("edge_auth_expiry");
  if (authEmail && authToken && authExpiry && Date.now() < parseInt(authExpiry, 10)) {
    return authEmail;
  }
  return null;
}

/** Build an account-specific localStorage key */
function accountKey(baseKey: string, email: string): string {
  return `${baseKey}__${email}`;
}

// ── Saved Cities ──────────────────────────────────────────────

export function getSavedCities(email?: string | null): string[] {
  if (typeof window === 'undefined') return [];
  const e = email ?? getAuthEmail();
  if (!e) return [];
  return JSON.parse(localStorage.getItem(accountKey("savedCities", e)) || "[]");
}

export function setSavedCities(cities: string[], email?: string | null): void {
  if (typeof window === 'undefined') return;
  const e = email ?? getAuthEmail();
  if (!e) return;
  localStorage.setItem(accountKey("savedCities", e), JSON.stringify(cities));
}

// ── Saved States ──────────────────────────────────────────────

export function getSavedStates(email?: string | null): string[] {
  if (typeof window === 'undefined') return [];
  const e = email ?? getAuthEmail();
  if (!e) return [];
  return JSON.parse(localStorage.getItem(accountKey("savedStates", e)) || "[]");
}

export function setSavedStates(states: string[], email?: string | null): void {
  if (typeof window === 'undefined') return;
  const e = email ?? getAuthEmail();
  if (!e) return;
  localStorage.setItem(accountKey("savedStates", e), JSON.stringify(states));
}

// ── Total saved count (for limit checks) ──────────────────────

export function getTotalSavedCount(email?: string | null): number {
  return getSavedCities(email).length + getSavedStates(email).length;
}

export function isAtSaveLimit(email?: string | null): boolean {
  const SAVE_LIMIT = 10;
  return getTotalSavedCount(email) >= SAVE_LIMIT;
}

// ── Migration helper ──────────────────────────────────────────
// One-time migration: move old non-prefixed savedCities/savedStates
// into the current user's account-specific keys, then remove the old keys.

export function migrateOldSavedData(email: string): void {
  if (typeof window === 'undefined') return;
  
  const oldCities = localStorage.getItem("savedCities");
  const oldStates = localStorage.getItem("savedStates");
  
  if (oldCities || oldStates) {
    // Merge old data into account-specific keys (don't overwrite if account already has data)
    const existingCities = getSavedCities(email);
    const existingStates = getSavedStates(email);
    
    if (oldCities) {
      const parsed: string[] = JSON.parse(oldCities);
      const merged = Array.from(new Set([...existingCities, ...parsed]));
      setSavedCities(merged, email);
      localStorage.removeItem("savedCities");
    }
    
    if (oldStates) {
      const parsed: string[] = JSON.parse(oldStates);
      const merged = Array.from(new Set([...existingStates, ...parsed]));
      setSavedStates(merged, email);
      localStorage.removeItem("savedStates");
    }
  }
}
