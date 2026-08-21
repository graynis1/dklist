// Minimal PWA service worker - ninth item from the "what else could be
// added" brainstorm list. Deliberately NOT a full asset-precaching
// strategy: Next.js chunk filenames are content-hashed and change on
// every build, so precaching "all assets" risks serving stale JS after a
// real deploy - a correctness bug worse than having no offline support at
// all. Scope kept to exactly one thing: cache the offline fallback page,
// and serve it only when a real navigation actually fails while offline.
// Everything else (API calls, data fetches) is untouched - always goes to
// the real network, never served stale from a cache.
const OFFLINE_CACHE = "dklist-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_URL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL)),
  );
});
