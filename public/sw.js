// Ìjènkéọ́mā service worker — PWA installability, light offline support, and
// push notifications for route-entry reminders.
//
// No build-time asset list: Vite's hashed filenames change every deploy, so
// instead of precaching a fixed manifest (which would need regenerating
// every build) this uses runtime caching — assets are cached the first time
// they're actually fetched, and served from cache on repeat visits/offline.

const CACHE_NAME = "ijenkeoma-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch cross-origin (API) calls

  // Navigations (the app shell itself): network-first so contributors always
  // get the latest build when online, falling back to the cached shell when
  // offline instead of a browser error page.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          caches.open(CACHE_NAME).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => caches.match(req).then((res) => res || caches.match("/")))
    );
    return;
  }

  // Static assets (hashed JS/CSS/images): cache-first, since a hashed
  // filename only ever points at one immutable version.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok) caches.open(CACHE_NAME).then((c) => c.put(req, res.clone()));
        return res;
      });
    })
  );
});

// ── Push notifications ───────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = { title: "🚌 Ìjènkéọ́mā", body: "Spotted a route today? Log it and earn XP!" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "route-reminder", // replaces any earlier unread reminder instead of stacking
      renotify: true,
      data: { url: data.url || "/" }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
