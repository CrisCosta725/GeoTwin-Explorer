const CACHE_NAME='geotwin-app-v1';
const APP_ASSETS=[
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/style.css',
  './assets/favicon.svg',
  './assets/pwa.js',
  './assets/analogs.js',
  './assets/analogy-limits.js',
  './assets/app.js',
  './assets/area-imagery.js',
  './assets/area-viewer.js',
  './assets/areas.js',
  './assets/base-assessment.js',
  './assets/case-study.js',
  './assets/cone-metrics.js',
  './assets/cone-panel.js',
  './assets/coordinates.js',
  './assets/discovery.js',
  './assets/evidence-quality.js',
  './assets/geology-coverage.js',
  './assets/globe.js',
  './assets/mission-panel.js',
  './assets/model.js',
  './assets/peru-geology-panel.js',
  './assets/peru-geology.js',
  './assets/project-file.js',
  './assets/relief.js',
  './assets/result-map.js',
  './assets/sector-comparison.js',
  './assets/study-earth.js',
  './assets/study-layers.js',
  './assets/study-metrics.js',
  './assets/study.js',
  './assets/terrain-comparison.js',
  './assets/terrain.js',
  './assets/validation-model.js',
  './assets/validation-panel.js',
  './assets/validation-policy.js',
  './assets/viewer-expand.js',
  './assets/welcome-intro.js',
  './assets/dm-sans.woff2',
  './assets/space-grotesk.woff2',
  './assets/earth-globe.webp',
  './assets/moon-globe.webp',
  './assets/mars-globe.webp',
  './assets/apollo17.jpg',
  './assets/area-apollo.webp',
  './assets/area-atacama.webp',
  './assets/area-cabeus.webp',
  './assets/area-firsoff.webp',
  './assets/area-gale.webp',
  './assets/area-jezero.webp',
  './assets/area-malapert.webp',
  './assets/area-marius.webp',
  './assets/area-meridiani.webp',
  './assets/area-olympus.webp',
  './assets/area-phoenix.webp',
  './assets/area-salda.webp',
  './assets/area-shackleton.webp',
  './assets/area-tycho.webp',
  './assets/area-ulysses.webp',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
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
