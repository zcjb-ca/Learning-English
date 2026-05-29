// Minimal service worker: enough to make the app installable (Add to Home
// Screen) without caching anything. The app needs the network for Claude
// feedback, so an offline cache would only risk serving stale code.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Pass-through: let the browser handle every request from the network.
});
