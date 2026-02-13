// Service Worker registration and utilities

export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('[SW] Registered:', registration.scope);

      // Check for updates periodically (every 30 min)
      setInterval(() => {
        registration.update();
      }, 30 * 60 * 1000);
    } catch (err) {
      console.warn('[SW] Registration failed:', err);
    }
  });
}

export function cacheAnalysisResult(address: string, data: unknown): void {
  if (typeof window === 'undefined' || !navigator.serviceWorker?.controller) return;

  navigator.serviceWorker.controller.postMessage({
    type: 'CACHE_ANALYSIS',
    url: `/api/property-cache?address=${encodeURIComponent(address)}`,
    data: { success: true, cached: true, data },
  });
}

export function clearServiceWorkerCache(): void {
  if (typeof window === 'undefined' || !navigator.serviceWorker?.controller) return;

  navigator.serviceWorker.controller.postMessage({
    type: 'CLEAR_CACHE',
  });
}

export function isOnline(): boolean {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
}
