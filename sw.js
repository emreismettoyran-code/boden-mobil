// Güncelleme sonrası eski sayfaların önbellekten gelmesini engelle
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{await self.clients.claim();const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)));})()));
self.addEventListener('fetch',event=>{if(event.request.method==='GET')event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));});