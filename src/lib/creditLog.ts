// Credit Activity Log — stores credit events in localStorage for user transparency

export interface CreditEvent {
  id: string;
  type: 'deduct' | 'refund' | 'purchase' | 'free';
  address: string;
  timestamp: number;
  creditsAfter: number;
  note?: string;
}

const STORAGE_KEY = 'edge_credit_log';
const MAX_EVENTS = 50; // Keep last 50 events

export function getCreditLog(): CreditEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CreditEvent[];
  } catch {
    return [];
  }
}

export function addCreditEvent(event: Omit<CreditEvent, 'id' | 'timestamp'>): void {
  if (typeof window === 'undefined') return;
  try {
    const log = getCreditLog();
    const newEvent: CreditEvent = {
      ...event,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };
    log.unshift(newEvent); // newest first
    // Trim to max
    if (log.length > MAX_EVENTS) log.length = MAX_EVENTS;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch (err) {
    console.error('[CreditLog] Failed to save event:', err);
  }
}

export function clearCreditLog(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function formatCreditEventTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
