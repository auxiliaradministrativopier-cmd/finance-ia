/*
 * Finance IA: service worker.
 * - Arquivos estáticos com hash (/_next/static, ícones): cache-first.
 * - Navegação: sempre pela rede; sem conexão, mostra a página /offline.
 * - Dados não passam por aqui: o Firestore tem cache offline próprio.
 * Atualize CACHE_VERSION quando mudar a lista de arquivos pré-carregados.
 */
const CACHE_VERSION = "v1";
const STATIC_CACHE = `finance-ia-static-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("finance-ia-") && key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Só o próprio site; Firebase, Google e demais serviços seguem direto para a rede.
  if (url.origin !== self.location.origin) return;
  // Rotas internas do Firebase Auth (/__/auth/...) nunca passam pelo cache.
  if (url.pathname.startsWith("/__/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        return (await cache.match(OFFLINE_URL)) ?? Response.error();
      }),
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
  }
});
