// Ezoter.ist service worker (Android uygulaması / PWA için, Murat 2026-10-23). Hiçbir içerik önbelleğe alınmaz
// (yorumlar saklanmaz); yalnız bağlantı yokken gösterilecek çevrimdışı sayfası tutulur.
const ONBELLEK = "ezoterist-cevrimdisi-v1";
const CEVRIMDISI = "/offline.html";
const SIMGE = "/pwa/icon-192.png";

self.addEventListener("install", (olay) => {
  olay.waitUntil(caches.open(ONBELLEK).then((c) => c.addAll([new Request(CEVRIMDISI, { cache: "reload" }), new Request(SIMGE, { cache: "reload" })])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (olay) => {
  olay.waitUntil(caches.keys().then((adlar) => Promise.all(adlar.filter((a) => a !== ONBELLEK).map((a) => caches.delete(a)))).then(() => self.clients.claim()));
});

// Yalnız sayfa açılışları: ağ varsa her zaman ağdan, yoksa çevrimdışı sayfası. Diğer istekler hiç ellenmez.
self.addEventListener("fetch", (olay) => {
  if (new URL(olay.request.url).pathname === SIMGE) {
    olay.respondWith(fetch(olay.request).catch(() => caches.match(SIMGE)));
    return;
  }
  if (olay.request.mode !== "navigate") return;
  olay.respondWith(fetch(olay.request).catch(() => caches.match(CEVRIMDISI)));
});
