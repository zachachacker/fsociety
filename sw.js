// Offline shell for the door-mode soundboard. The sounds themselves live in the phone's
// IndexedDB (board.html saves them), so this only has to keep board.html itself available.
// Every other request (the QR page, the rig, anything else) is left alone and goes to the network.
const CACHE = "fsoc-board-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add("board.html")).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("fsoc-board") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  const base = new URL(self.registration.scope).pathname;
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname !== base + "board.html") return;
  // Network first so updates show up when there's signal; fall back to the saved copy after 3s
  // or when offline, so a weak signal at a door doesn't leave the page hanging.
  const network = fetch(e.request).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("board.html", copy)); }
    return res;
  });
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("slow")), 3000));
  e.respondWith(
    Promise.race([network, timeout]).catch(() =>
      caches.match("board.html").then((hit) => hit || network)
    )
  );
});
