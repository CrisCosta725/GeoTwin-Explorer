const CACHE_NAME = "geotwin-guide-first-v1";

const APP_ASSETS = [ "./assets/motion.js", "./assets/earth-imagery/andagua.png", "./assets/earth-imagery/askja.png", "./assets/earth-imagery/atacama.png", "./assets/earth-imagery/barrow.png", "./assets/earth-imagery/cinder-lake.png", "./assets/earth-imagery/coropuna.png", "./assets/earth-imagery/cumbemayo.png", "./assets/earth-imagery/haughton.png", "./assets/earth-imagery/huambo.png", "./assets/earth-imagery/isabella-choten.png", "./assets/earth-imagery/kilauea.png", "./assets/earth-imagery/la-joya.png", "./assets/earth-imagery/lanzarote.png", "./assets/earth-imagery/lava-beds.png", "./assets/earth-imagery/mcmurdo.png", "./assets/earth-imagery/meteor-crater.png", "./assets/earth-imagery/nasca-palpa.png", "./assets/earth-imagery/pilot.png", "./assets/earth-imagery/ries.png", "./assets/earth-imagery/sucre.png", "./assets/earth-image.js", "./assets/earth-imagery.js", "./assets/earth-profile.js", "./assets/earth-profiles.js", "./assets/earth-relief.webp", "./assets/earth-relief-provenance.json", "./assets/mars-relief.webp", "./assets/mars-elevation.js", "./assets/mars-profile.js", "./assets/mars-elevation.bin", "./assets/lunar-profiles.js", "./assets/crater-profile.js", "./assets/earth-summary.js", "./assets/astronaut-3d.js", "./assets/astronaut-model.js", "./assets/astronaut-fallback.js", "./assets/astronaut-motion.js", "./assets/three.module.min.js", "./assets/study-rationale.js", "./assets/study-rationale-map.js", "./", "./index.html", "./manifest.webmanifest", "./assets/analogs.js", "./assets/areas.js", "./assets/atlas-app.js", "./assets/coordinates.js", "./assets/content-en.js", "./assets/dm-sans.woff2", "./assets/earth-globe.webp", "./assets/evaluation-schema.js", "./assets/favicon.svg", "./assets/globe.js", "./assets/i18n.js", "./assets/lunar-matrix.js", "./assets/mars-globe.webp", "./assets/mars-operations.js", "./assets/moon-globe.webp", "./assets/pwa.js", "./assets/site-matches.js", "./assets/space-grotesk.woff2", "./assets/style.css", "./assets/terrain.js", "./assets/welcome-intro.js" ];

APP_ASSETS.push("./assets/polar-profiles.js");

self.addEventListener("install", event => {
  event.waitUntil(Promise.all([ caches.open(CACHE_NAME).then(cache => cache.addAll(APP_ASSETS.map(url => new Request(url, {
    cache: "reload"
  })))), self.skipWaiting() ]));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith("geotwin-") && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    if(/\.(webp|png|jpg|woff2|bin)$/.test(url.pathname)){
      const cached=await caches.match(request);
      if(cached)return cached;
    }
    try {
      const response = await fetch(request, {
        cache: "no-cache"
      });
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === "navigate") {
        const fallback = await caches.match(new URL("./", self.registration.scope));
        if (fallback) return fallback;
      }
      throw error;
    }
  })());
});
