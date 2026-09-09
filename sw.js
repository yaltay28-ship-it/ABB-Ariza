// ABB Arıza Rehberi — çevrimdışı çalışma (Service Worker)
// Sürüm değiştiğinde eski önbellek silinir ve dosyalar yeniden indirilir.
const CACHE = 'abb-ariza-v1';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './videos/%20Dddd%20MP4.mp4'
];

// Kurulum: tüm dosyaları önbelleğe al
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      // tek tek ekle: bir dosya inmezse kurulum tamamen çökmesin
      Promise.all(
        ASSETS.map(url =>
          cache.add(new Request(url, { cache: 'reload' })).catch(err =>
            console.warn('Önbelleğe alınamadı:', url, err)
          )
        )
      )
    ).then(() => self.skipWaiting())
  );
});

// Etkinleşme: eski sürüm önbelleklerini temizle
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// İstekler: önce önbellek, yoksa ağ (ve ağdan geleni önbelleğe ekle)
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(cached => {
      if (cached) return cached;

      return fetch(req).then(res => {
        // sadece başarılı, aynı origin yanıtları önbelleğe al
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
        }
        return res;
      }).catch(() => {
        // çevrimdışı ve önbellekte yoksa: ana sayfayı döndür
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 503, statusText: 'Çevrimdışı' });
      });
    })
  );
});
