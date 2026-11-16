import { earthImagery } from "./earth-imagery.js";

export function satelliteZoom(lat, width = 320) {
  return Math.max(0, Math.min(21, Math.round(Math.log2(156543.03392 * Math.cos(lat * Math.PI / 180) * Math.max(200, width) / 1000))));
}

export function satelliteURL(lat, lon, lang = "es", width = 320) {
  const params = new URLSearchParams({ll:lat+","+lon,q:lat+","+lon,t:"k",z:String(satelliteZoom(lat,width)),hl:lang,output:"embed"});
  return "https://maps.google.com/maps?"+params;
}

export function bindEarthImage(root) {
  const frame=root.querySelector("[data-google-satellite]");
  if(!frame)return;
  const width=frame.getBoundingClientRect().width||320;
  const url=satelliteURL(Number(frame.dataset.lat),Number(frame.dataset.lon),frame.dataset.language,width);
  if(frame.src!==url)frame.src=url;
}

export function earthImage(id, lang = "es") {
  const data = earthImagery[id];
  if (!data) return "";
  const en = lang === "en", landsat = data.layer.startsWith("Landsat");
  const source = landsat ? "NASA GIBS · Landsat WELD" : "NASA GIBS · MODIS Terra";
  const label = en ? "Satellite context of the selected site" : "Contexto satelital del sitio seleccionado";
  const lat=(data.bbox[1]+data.bbox[3])/2,lon=(data.bbox[0]+data.bbox[2])/2;
  const external=new URL("https://www.google.com/maps/@");
  external.search=new URLSearchParams({api:"1",map_action:"map",center:lat+","+lon,zoom:String(satelliteZoom(lat)),basemap:"satellite"});
  return '<figure class="earth-site-image"><figcaption><strong>' + source + '</strong><span>' + (en ? "NASA image · 10 × 10 km · available offline" : "Imagen NASA · 10 × 10 km · disponible sin conexión") + '</span></figcaption><a class="earth-image-frame" href="assets/' + data.file + '" target="_blank" rel="noopener" aria-label="' + (en ? "Open full image" : "Abrir imagen completa") + '"><img src="assets/' + data.file + '" width="512" height="512" loading="lazy" alt="' + label + ' · ' + source + '"><span class="earth-image-center" aria-hidden="true">＋</span><span class="earth-image-scale">2 km</span></a><p>' + (en ? "The cross marks the catalog coordinate; it does not delimit the study area." : "La cruz marca la coordenada del catálogo; no delimita el área de estudio.") + "</p><p>" + (landsat ? en ? "Historical annual true-color composite; requested GIBS time: 2000-12-01. Not a current photograph." : "Compuesto anual histórico en color natural; fecha solicitada a GIBS: 2000-12-01. No es una fotografía actual." : en ? "MODIS Terra true-color image, 2024-01-15. Regional context at coarse resolution; clouds may obscure terrain." : "Imagen MODIS Terra en color natural, 2024-01-15. Contexto regional de resolución gruesa; las nubes pueden ocultar el terreno.") + '</p><a href="' + data.sourceURL.replaceAll("&", "&amp;") + '" target="_blank" rel="noopener">' + source + ' ↗</a><div class="satellite-map"><strong>Google Satellite</strong><span>' + (en ? "Initial view ≈ 1 km across · internet required" : "Vista inicial ≈ 1 km de ancho · requiere conexión") + '</span><iframe class="google-satellite-frame" data-google-satellite data-lat="' + lat + '" data-lon="' + lon + '" data-language="' + lang + '" title="' + label + ' · Google Satellite" src="' + satelliteURL(lat,lon,lang).replaceAll("&","&amp;") + '" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe><p>' + (en ? "Centered on the catalog coordinate. The initial extent is approximate and changes with zoom. Imagery dates and available detail vary by location. If the map does not load, use the NASA image above or open Google Satellite directly." : "Centrado en la coordenada del catálogo. El encuadre inicial es aproximado y cambia con el zoom. La fecha y el detalle disponible de las imágenes varían según el lugar. Si el mapa no carga, usa la imagen NASA de arriba o abre Google Satellite directamente.") + '</p><a href="' + external.href.replaceAll("&","&amp;") + '" target="_blank" rel="noopener">' + (en ? "Open Google Satellite" : "Abrir Google Satellite") + " ↗</a></div></figure>";
}
