const CACHE = "orthodox-bible-v26";
const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./swipe.js",
  "./personal-notes.js",
  "./prayers-data.js",
  "./styles.css",
  "./bible-data.js",
  "./legacy-web-data.js",
  "./edition.js",
  "./study-data.js",
  "./wisdom-data.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./apple-touch-icon.png",
  "./icon-512.png",
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(ASSETS.map((url) => new Request(url, { cache: "reload" }))),
      )
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("orthodox-bible-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const req = event.request,
    url = new URL(req.url);
  if (
    req.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.href.startsWith(self.registration.scope)
  )
    return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        return await fetch(req);
      } catch {
        if (req.mode === "navigate")
          return (await cache.match("./index.html")) || Response.error();
        return Response.error();
      }
    }),
  );
});
