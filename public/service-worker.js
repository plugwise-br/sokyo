// Cache so do "shell" do app (HTML/CSS/JS) - nunca dados da API, nunca a
// marca (manifest.json e os icones dependem do que o super admin definiu
// em /admin e podem mudar a qualquer momento sem um novo deploy, entao
// NUNCA podem ficar presos em cache - sempre direto da rede).
const CACHE_NAME = "sokyo-shell-v3";
const SHELL_FILES = [
  "/", "/index.html",
  "/css/style.css",
  "/js/main.js", "/js/api.js", "/js/format.js", "/js/branding.js", "/js/childView.js", "/js/parentView.js"
];
const NEVER_CACHE_PATHS = ["/manifest.json", "/icons/", "/branding-uploads/"];

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
  if (NEVER_CACHE_PATHS.some((p) => url.pathname.startsWith(p))) return; // marca do produto: sempre rede, nunca cache

  // Network-first: sempre busca a versao mais nova primeiro (garante que um
  // deploy novo aparece na hora, sem precisar de dois reloads). O cache so
  // entra como fallback se a rede falhar (offline).
  event.respondWith(
    fetch(event.request).then((res) => {
      if (res.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, res.clone()));
      return res;
    }).catch(() => caches.match(event.request))
  );
});
