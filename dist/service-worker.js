const CACHE_NAME='geotwin-atlas-without-gis-v11';
const APP_ASSETS=[
  './assets/study-rationale.js',
  './assets/study-rationale-map.js',
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/analogs.js",
  "./assets/area-apollo.webp",
  "./assets/area-atacama.webp",
  "./assets/area-cabeus.webp",
  "./assets/area-firsoff.webp",
  "./assets/area-gale.webp",
  "./assets/area-jezero.webp",
  "./assets/area-malapert.webp",
  "./assets/area-marius.webp",
  "./assets/area-meridiani.webp",
  "./assets/area-olympus.webp",
  "./assets/area-phoenix.webp",
  "./assets/area-salda.webp",
  "./assets/area-shackleton.webp",
  "./assets/area-tycho.webp",
  "./assets/area-ulysses.webp",
  "./assets/areas.js",
  "./assets/atlas-app.js",
  "./assets/coordinates.js",
  "./assets/content-en.js",
  "./assets/dm-sans.woff2",
  "./assets/earth-globe.webp",
  "./assets/evaluation-schema.js",
  "./assets/favicon.svg",
  "./assets/globe.js",
  "./assets/i18n.js",
  "./assets/lunar-matrix.js",
  "./assets/mars-globe.webp",
  "./assets/mars-operations.js",
  "./assets/moon-globe.webp",
  "./assets/pwa.js",
  "./assets/site-matches.js",
  "./assets/space-grotesk.woff2",
  "./assets/style.css",
  "./assets/terrain.js",
  "./assets/welcome-intro.js"
];

self.addEventListener('install',event=>{
  event.waitUntil(Promise.all([
    caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_ASSETS)),
    self.skipWaiting()
  ]));
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith('geotwin-')&&name!==CACHE_NAME).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;

  event.respondWith((async()=>{
    try {
      const response=await fetch(request);
      if(response.ok) {
        const cache=await caches.open(CACHE_NAME);
        await cache.put(request,response.clone());
      }
      return response;
    } catch(error) {
      const cached=await caches.match(request);
      if(cached)return cached;
      if(request.mode==='navigate') {
        const fallback=await caches.match(new URL('./',self.registration.scope));
        if(fallback)return fallback;
      }
      throw error;
    }
  })());
});
