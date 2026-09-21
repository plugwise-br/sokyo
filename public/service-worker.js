// Cache so do "shell" do app (HTML/CSS/JS/icones) - nunca dados da API.
// Isso deixa o app abrir instantaneo (e funcionar offline pra ver a tela),
// sem arriscar mostrar dado desatualizado: toda chamada a /api/ vai direto
// pra rede, sem cache algum.
const CACHE_NAME = "sokyo-shell-v1";
const SHELL_FILES = [
  "/", "/index.html", "/manifest.json",
  "/css/style.css",
  "/js/main.js", "/js/api.js", "/js/format.js", "/js/childView.js", "/js/parentView.js",
  "/icons/icon-192.png", "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.pathname.startsWith("/api/")) return; // nunca intercepta API

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((res) => {
        if (res.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
