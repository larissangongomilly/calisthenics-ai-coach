// Service worker: lets the installed app open without network and keeps the
// pose model on the device, so it is only downloaded once.
//
// - Pages: network first (always the newest version), cache as fallback.
// - Built files (/assets/, names contain a hash) and the MediaPipe files from
//   the CDN: cache first, they never change under the same address.
// - Everything else from this site (icons, manifest): network first.
const CACHE = "coach-v1";
const CDN_HOSTS = ["cdn.jsdelivr.net", "storage.googleapis.com"];

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Only complete, normal answers are stored (no errors, no login redirects).
function isCacheable(response) {
  return response.ok && (response.type === "basic" || response.type === "cors");
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  if (isCacheable(response)) {
    const cache = await caches.open(CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, fallbackUrl) {
  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      const cache = await caches.open(CACHE);
      cache.put(fallbackUrl ?? request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(fallbackUrl ?? request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);

  if (request.mode === "navigate") {
    // Every page of this one-page app is the same index.html.
    event.respondWith(networkFirst(request, scope.href));
  } else if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(request));
  } else if (url.origin === scope.origin) {
    const isBuiltFile = url.pathname.startsWith(`${scope.pathname}assets/`);
    event.respondWith(isBuiltFile ? cacheFirst(request) : networkFirst(request));
  }
});
