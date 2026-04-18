/* Autel MaxiSYS MS Ultra S2 — Service Worker v1.1 */
const CACHE_NAME = "autel-maxisys-v1.1";
const BASE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const assetPath = (path) => `${BASE_PATH}${path}`;
const STATIC_ASSETS = [
  assetPath("/"),
  assetPath("/index.html"),
  assetPath("/manifest.json"),
  assetPath("/favicon.svg"),
  assetPath("/opengraph.jpg"),
];

/* ── Install: cache static shell ──────────────────────────── */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

/* ── Activate: clean old caches ───────────────────────────── */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: network-first with cache fallback ─────────────── */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  /* Skip non-GET, cross-origin, and API requests (always fresh) */
  if (request.method !== "GET") return;
  if (url.pathname.startsWith(assetPath("/api/"))) return;
  if (url.pathname.startsWith("/api/")) return;
  if (!url.origin.includes(self.location.hostname)) return;

  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res && res.status === 200) {
          const cloned = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        }
        return res;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match(assetPath("/"))))
  );
});
