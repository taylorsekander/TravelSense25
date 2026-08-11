/**
 * TravelSense service worker.
 *
 * Deliberately conservative. The app is a single large HTML file that changes
 * with every deploy, so it is fetched from the network first — a stale shell
 * would be far worse than a slow one. The cache exists so the app opens when
 * there is no connection at all.
 *
 * API calls are never cached: recommendations and speech must be live.
 */
const CACHE = "travelsense-v1";
const SHELL = ["/", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Never touch the API or anything cross-origin.
  if (url.pathname.startsWith("/api/") || url.origin !== self.location.origin) return;
  if (e.request.method !== "GET") return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Keep a copy for offline use.
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches.match(e.request).then((hit) => hit || caches.match("/"))
      )
  );
});
