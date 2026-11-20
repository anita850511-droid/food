const CACHE_NAME = "food-tracker-v7";
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon.svg", "./app-icon.png", "./drive-sync.js", "./GOOGLE-DRIVE-SETUP.md"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key.startsWith("food-tracker-") && key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === "navigate" || new URL(event.request.url).pathname.endsWith("/drive-sync.js") || new URL(event.request.url).pathname.endsWith("/manifest.json")) {
    event.respondWith(fetch(event.request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)));
      }
      return response;
    }).catch(async () => (await caches.match(event.request)) || caches.match('./index.html')));
  } else {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
  }
});



