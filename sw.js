// TRK PCP 2026 — Service Worker mínimo
// Objetivo único: permitir que o navegador ofereça "Instalar app".
// NÃO faz cache agressivo — o app depende de dados em tempo real
// (Supabase + Ably), então cachear respostas antigas quebraria isso.

const CACHE_NAME = 'trk-pcp-shell-v1';
const SHELL_FILES = ['./index.html'];

// Instala e guarda só o esqueleto (pra abrir algo se estiver 100% offline)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
});

// Ativa e limpa caches antigos de versões anteriores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Estratégia: SEMPRE busca da rede primeiro (dados atuais).
// Só usa o cache do esqueleto como último recurso se estiver sem internet.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return; // não mexe em POST/PATCH (Supabase)
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((r) => r || caches.match('./index.html'))
    )
  );
});
