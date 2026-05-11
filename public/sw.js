const CACHE_NAME = 'book-memo-v2.2.3';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon.svg',
  '/next.svg',
  '/vercel.svg',
  '/globe.svg',
  '/window.svg'
];

// 설치 단계: 정적 에셋 캐싱
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 활성화 단계: 이전 캐시 삭제
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// 페치 단계: 전략적 캐싱
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // 1. 캐싱 대상 판별
  // 정적 자산 (동일 도메인)
  const isStaticAsset = 
    STATIC_ASSETS.includes(url.pathname) || 
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.ico');

  // 외부 도서 이미지 (Kakao/Daum)
  const isExternalImageAsset = 
    url.hostname.includes('kakaocdn.net') || 
    url.hostname.includes('daumcdn.net');

  // Next.js 데이터 요청이나 서버 액션은 제외
  const isDynamicRequest = 
    url.pathname.startsWith('/api/') || 
    url.pathname.includes('/_next/data/') ||
    event.request.method !== 'GET';

  if ((isStaticAsset || isExternalImageAsset) && !isDynamicRequest) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) return cachedResponse;
        
        return fetch(event.request).then(response => {
          // 성공적인 응답은 캐시에 저장
          // 외부 이미지(opaque)도 캐싱할 수 있도록 check status && type 유연하게 처리
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

  // 2. 그 외 요청: 항상 네트워크 우선
  return;
});
