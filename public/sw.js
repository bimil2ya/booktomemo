const CACHE_NAME = 'book-memo-v2.7.5';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon.png'
];

// 설치 단계: 정적 에셋 캐싱
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 활성화 단계: 이전 캐시 삭제 (강력한 클린업)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => {
          console.log('[SW] Deleting old cache:', name);
          return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});

// 페치 단계: 네트워크 우선 전략 (이미지 제외)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // 외부 도서 이미지 (Kakao/Daum) - 캐시 우선 (데이터 절약)
  const isExternalImageAsset = 
    url.hostname.includes('kakaocdn.net') || 
    url.hostname.includes('daumcdn.net');

  if (isExternalImageAsset) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then(response => {
          if (response && (response.status === 200 || response.type === 'opaque')) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // 그 외 정적 자산 및 페이지: 네트워크 우선, 실패 시 캐시 (최신 버전 보장)
  if (event.request.method === 'GET' && !url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // 성공적인 응답이면 캐시 업데이트
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // 네트워크 실패 시에만 캐시에서 찾음
          return caches.match(event.request);
        })
    );
  }
});
