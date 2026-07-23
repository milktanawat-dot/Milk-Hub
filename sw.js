/* Milk Hub service worker — ทำให้เปิด offline ได้ */
const CACHE = 'milkhub-v2';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // API ภายนอก (Binance/Finnhub/Graph/Tesseract/MSAL) — ผ่านเน็ตตรงเสมอ
  if (url.origin !== location.origin) return;

  // หน้าแอปหลัก: network-first (ได้เวอร์ชันใหม่เมื่อออนไลน์ ใช้ cache เมื่อออฟไลน์)
  if (e.request.mode === 'navigate' || url.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => { caches.open(CACHE).then(c => c.put(e.request, res.clone())); return res.clone(); })
        .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // ไฟล์อื่นใน origin เดียวกัน: cache-first
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      return res.clone();
    }))
  );
});
