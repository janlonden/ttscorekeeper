const cacheName = 'ttscorekeeper-cache-v1'

const urlsToCache = [
  '/ttscorekeeper/',
  '/ttscorekeeper/index.js',
  '/ttscorekeeper/index.css',
  '/ttscorekeeper/manifest.webmanifest',
  '/ttscorekeeper/logo-192.png',
  '/ttscorekeeper/logo-512.png'
]

self.addEventListener('install', event =>
  event.waitUntil(
    caches.open(cacheName).then(cache => cache.addAll(urlsToCache))
  )
)

self.addEventListener('fetch', event =>
  event.respondWith(
    caches
      .open(cacheName)

      .then(cache =>
        fetch(event.request)
          .then(
            response => (cache.put(event.request, response.clone()), response)
          )

          .catch(() => caches.match(event.request).then(response => response))
      )
  )
)
