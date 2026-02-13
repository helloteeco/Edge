// Edge App Service Worker — Offline-first caching for analysis results
const CACHE_NAME = 'edge-v1';
const ANALYSIS_CACHE = 'edge-analysis-v1';
const STATIC_CACHE = 'edge-static-v1';

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/calculator',
  '/saved',
];

// API routes to cache with network-first strategy
const CACHEABLE_API_PATTERNS = [
  /\/api\/property-cache/,
  /\/api\/credits/,
];

// Install: pre-cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[SW] Pre-cache failed (non-blocking):', err);
        return self.skipWaiting();
      })
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  const KEEP = [CACHE_NAME, ANALYSIS_CACHE, STATIC_CACHE];
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: strategy depends on request type
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // API routes: network-first, fall back to cache
  if (CACHEABLE_API_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(networkFirstThenCache(request, ANALYSIS_CACHE));
    return;
  }

  // Navigation requests: network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstThenCache(request, STATIC_CACHE));
    return;
  }

  // Static assets (JS, CSS, images): cache-first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstThenNetwork(request, STATIC_CACHE));
    return;
  }
});

// Network-first: try network, cache the response, fall back to cache
async function networkFirstThenCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // Return a minimal offline response for navigation
    if (request.mode === 'navigate') {
      return new Response(
        '<html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f4f0"><div style="text-align:center;padding:2rem"><h2 style="color:#2b2823">You\'re offline</h2><p style="color:#787060">Your saved analyses are still available in the History tab.</p><button onclick="location.reload()" style="margin-top:1rem;padding:0.5rem 1.5rem;border-radius:0.5rem;border:none;background:#2b2823;color:white;cursor:pointer">Retry</button></div></body></html>',
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      );
    }
    throw err;
  }
}

// Cache-first: try cache, fall back to network and cache the result
async function cacheFirstThenNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    // Return a transparent 1x1 gif for images, empty response otherwise
    if (request.destination === 'image') {
      return new Response(
        Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), c => c.charCodeAt(0)),
        { headers: { 'Content-Type': 'image/gif' } }
      );
    }
    throw err;
  }
}

function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)$/.test(pathname)
    || pathname.startsWith('/_next/static/');
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CACHE_ANALYSIS') {
    // Manually cache an analysis result
    const { url, data } = event.data;
    caches.open(ANALYSIS_CACHE).then((cache) => {
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
      cache.put(url, response);
    });
  }

  if (event.data?.type === 'CLEAR_CACHE') {
    caches.delete(ANALYSIS_CACHE);
    caches.delete(STATIC_CACHE);
  }
});
