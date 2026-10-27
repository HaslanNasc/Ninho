// NINHO service worker — cache versionado, navegação network-first
// Troque a versão ao publicar uma atualização para invalidar o cache antigo.
const VERSION = 'ninho-v1.0.0';
const CORE = ['./','index.html','styles.css','config.js','db.js','app.js','manifest.webmanifest'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE).catch(()=>{})));
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Nunca cachear chamadas ao Supabase/APIs externas (evita dados velhos / travas)
  if (url.origin !== location.origin) return;
  // Navegação: network-first com fallback ao cache (corrige "quebrar ao voltar")
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => {
      const cp = r.clone(); caches.open(VERSION).then(c => c.put('index.html', cp)); return r;
    }).catch(() => caches.match('index.html')));
    return;
  }
  // Estáticos: stale-while-revalidate
  e.respondWith(caches.match(req).then(cached => {
    const net = fetch(req).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); return r; }).catch(() => cached);
    return cached || net;
  }));
});
