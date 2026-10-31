// 앱 껍데기를 캐시해 두고, 새 버전이 있으면 받아서 다음 실행 때 쓴다.
// 데모(/)와 정식판(/app/)이 같은 주소 아래 있어서, 캐시 이름에 범위를 붙여 서로 지우지 않게 한다
const SCOPE = self.registration.scope;
const CACHE = 'offstage-v6|' + SCOPE;
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './logo.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && (k.endsWith('|' + SCOPE) || !k.includes('|'))).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

// 네트워크 우선, 안 되면 캐시 (오프라인에서도 열리게)
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('./index.html'))),
  );
});
