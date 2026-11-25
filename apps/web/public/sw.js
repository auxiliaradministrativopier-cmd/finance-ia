/*
 * Finance IA: service worker.
 * - Navegação: rede primeiro. Sem conexão, abre a última versão da tela já visitada (o HTML não
 *   tem dados do usuário; os dados vêm do cache offline do Firestore) ou a página /offline.
 * - Arquivos estáticos com hash (/_next/static, ícones): cache primeiro, com limite de itens.
 * - Rotas /api e de autenticação nunca passam pelo cache.
 * Mude CACHE_VERSION quando mudar a estratégia ou a lista de arquivos pré-carregados.
 */
const CACHE_VERSION = "v2";
const STATIC_CACHE = `finance-ia-static-${CACHE_VERSION}`;
const PAGES_CACHE = `finance-ia-pages-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon.svg"];
const MAX_STATIC_ENTRIES = 250;
const MAX_PAGE_ENTRIES = 40;

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
            .filter(
              (key) => key.startsWith("finance-ia-") && key !== STATIC_CACHE && key !== PAGES_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** Mantém o cache dentro do limite, apagando os itens mais antigos. */
async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(keys.length - max, 0))) await cache.delete(key);
}

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
}

async function navigate(request) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const response = await fetch(request);
    const type = response.headers.get("content-type") ?? "";
    if (response.ok && response.type === "basic" && type.includes("text/html")) {
      await cache.put(request.url, response.clone());
      trim(PAGES_CACHE, MAX_PAGE_ENTRIES);
    }
    return response;
  } catch {
    const page = await cache.match(request.url, { ignoreSearch: true });
    if (page) return page;
    const offline = await caches.match(OFFLINE_URL);
    return offline ?? Response.error();
  }
}

async function staticAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    trim(STATIC_CACHE, MAX_STATIC_ENTRIES);
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Só o próprio site; Firebase, Google e demais serviços seguem direto para a rede.
  if (url.origin !== self.location.origin) return;
  // Rotas internas do Firebase Auth (/__/auth/...) e as rotas /api nunca passam pelo cache.
  if (url.pathname.startsWith("/__/") || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(navigate(request));
    return;
  }
  if (isStaticAsset(url)) event.respondWith(staticAsset(request));
});
