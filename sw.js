/* Service Worker — PWA shell + offline fallback
 * Content chapters: network-first on each page load (refresh applies updates).
 * App shell: cache-first after first install.
 */
var SHELL_CACHE = 'under-noise-shell-v4';
var CONTENT_CACHE = 'under-noise-content-v4';

var SHELL_URLS = [
  './',
  './index.html',
  './css/style.css',
  './css/themes.css',
  './js/settings.js',
  './js/chapters.js',
  './js/app.js',
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/favicon-32.png',
  './assets/favicon-16.png',
  './assets/apple-touch-icon.png',
  './assets/logo.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function (cache) {
      return cache.addAll(SHELL_URLS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) {
          return k !== SHELL_CACHE && k !== CONTENT_CACHE;
        }).map(function (k) {
          return caches.delete(k);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

function isChapterRequest(url) {
  return /\/chapters\//.test(url.pathname) || /manifest\.json$/.test(url.pathname);
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }

  /* Same-origin only */
  if (url.origin !== self.location.origin) return;

  /* Chapters + manifest: network-first, cache as fallback (offline) */
  if (isChapterRequest(url)) {
    event.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CONTENT_CACHE).then(function (cache) {
            cache.put(req, copy);
          });
        }
        return res;
      }).catch(function () {
        return caches.open(CONTENT_CACHE).then(function (cache) {
          return cache.match(req).then(function (hit) {
            return hit || caches.match(req);
          });
        });
      })
    );
    return;
  }

  /* Shell: network-first so refresh gets new JS/CSS, cache fallback offline */
  event.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok && (req.url.indexOf('.html') !== -1 ||
          req.url.indexOf('.css') !== -1 ||
          req.url.indexOf('.js') !== -1 ||
          req.url.indexOf('manifest') !== -1 ||
          req.url.indexOf('.png') !== -1 ||
          req.mode === 'navigate')) {
        var copy = res.clone();
        caches.open(SHELL_CACHE).then(function (cache) {
          cache.put(req, copy);
        });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        if (hit) return hit;
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return undefined;
      });
    })
  );
});

/* Allow page to ask SW to drop content cache (optional) */
self.addEventListener('message', function (event) {
  if (!event.data) return;
  if (event.data.type === 'CLEAR_CONTENT_CACHE') {
    event.waitUntil(caches.delete(CONTENT_CACHE));
  }
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
