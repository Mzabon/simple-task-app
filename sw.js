// v0.8: HTML은 온라인일 때 최신 파일을 요청하고, 오프라인일 때 캐시를 사용합니다.
const CACHE_NAME = 'simple-task-app-v08-1';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './icons/icon-48.png', './icons/icon-180.png', './icons/icon-192.png',
  './icons/icon-512.png', './icons/icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      // v0.7에서 처음 올라올 때는 기존 버전의 업데이트 UI가 없으므로 바로 교체합니다.
      // 향후 버전의 서비스 워커에서는 사용자 선택형 업데이트를 위해 생략할 수 있습니다.
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith('simple-task-app-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    )),
    self.clients.claim()
  ]));
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copy)));
        }
        return response;
      }).catch(async () => await caches.match(request) || await caches.match('./index.html') || Response.error())
    );
    return;
  }
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copy)));
      }
      return response;
    }))
  );
});
