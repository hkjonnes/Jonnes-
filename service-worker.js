self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("hkj-cache").then(cache => {
      return cache.addAll([
        "./",
        "index.html",
        "style.css",
        "app.js",
        "poems.js",
        "manifest.json"
      ]);
    })
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
