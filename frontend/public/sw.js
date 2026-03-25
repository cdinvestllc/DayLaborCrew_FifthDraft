/* TheDayLaborers Service Worker v1.0 */
const CACHE_NAME = "daylaborers-v1";
const STATIC_ASSETS = [
  "/",
  "/static/js/bundle.js",
  "/static/css/main.css",
  "/manifest.json"
];

const API_CACHE = "daylaborers-api-v1";
const API_CACHE_URLS = ["/api/public/settings", "/api/public/trades", "/api/payments/plans"];

// Install: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== API_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and chrome-extension
  if (event.request.method !== "GET") return;
  if (url.protocol === "chrome-extension:") return;

  // API routes: network-first, fallback to cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok && API_CACHE_URLS.some((u) => url.pathname.includes(u))) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets: cache-first with network fallback
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// Push Notifications
self.addEventListener("push", (event) => {
  let data = { title: "TheDayLaborers", body: "You have a new notification.", icon: "/logo192.png" };
  try {
    data = event.data ? { ...data, ...event.data.json() } : data;
  } catch (e) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "/logo192.png",
      badge: "/logo192.png",
      tag: data.tag || "daylaborers",
      data: data.url ? { url: data.url } : {}
    })
  );
});

// Notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
