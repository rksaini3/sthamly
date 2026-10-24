/* Sthamly service worker.
 * Rules:
 * - Personal pages (plan, track, ask, profile, result) and all /api/ calls are never cached.
 * - Public pages (/ and /quiz) are cached network-first, for offline use.
 * - Static build files (/_next/static) and icons are cached cache-first.
 * - Cross-origin requests (Supabase, Razorpay, fonts) are not touched.
 */

const VERSION = "sthamly-v1";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;

const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

const PUBLIC_PAGES = ["/", "/quiz"];
const NEVER_HANDLE_PREFIXES = ["/api/", "/auth/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {
        // A failed precache must not block install. Pages still work online.
      })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("sthamly-") && !key.startsWith(VERSION))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// The page can ask a waiting worker to take over (used for "नया version उपलब्ध है" later).
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Only handle our own origin. Supabase, Razorpay and other hosts go straight to the network.
  if (url.origin !== self.location.origin) return;

  if (NEVER_HANDLE_PREFIXES.some((p) => url.pathname.startsWith(p))) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request, url));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkWithCacheFallback(request));
});

async function handleNavigation(request, url) {
  const isPublic = PUBLIC_PAGES.includes(url.pathname);

  try {
    const response = await fetch(request);

    if (isPublic && response.ok) {
      const cache = await caches.open(PAGE_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    if (isPublic) {
      const cached = await caches.match(request);
      if (cached) return cached;
    }

    const offline = await caches.match(OFFLINE_URL);
    return offline || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;

  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

async function networkWithCacheFallback(request) {
  try {
    return await fetch(request);
  } catch {
    const cached = await caches.match(request);
    return cached || Response.error();
  }
}