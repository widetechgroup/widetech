// Minimal service worker: makes the app installable and shows an offline notice.
// It never caches data or sign-in requests — everything goes to the network.
const OFFLINE = "/offline.html";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open("wt-shell-v1").then((c) => c.addAll([OFFLINE, "/icon-192.png"])));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)));
});
