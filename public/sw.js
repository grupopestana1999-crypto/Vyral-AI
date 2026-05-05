// Auto-destruct service worker.
// O SW antigo (vyral-ai-v1) cacheava bundle JS agressivamente, fazendo cliente ficar
// preso em versões antigas mesmo com deploys novos. Sem PWA / requisito offline,
// o SW só atrapalhava. Esse arquivo se desregistra + limpa todos os caches na
// primeira ativação. main.tsx também não chama register, então depois disso
// nunca mais terá SW pro origin.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => c.navigate(c.url));
  })());
});
