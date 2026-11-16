import { earthProfiles } from "./earth-profiles.js";
import { polarProfiles } from "./polar-profiles.js";

export function earthProfile(id, lang = "es") {
  const data = polarProfiles[id] || earthProfiles[id], en = lang === "en";
  if (!data) return "";
  if (data.unavailable) return '<section class="crater-profile"><h4>NASADEM</h4><p>' + (en ? "This site is outside NASADEM coverage (56° S–60° N). No NASADEM profile is available." : "Este sitio está fuera de la cobertura NASADEM (56° S–60° N). No hay perfil NASADEM disponible.") + "</p></section>";
  const f = new Intl.NumberFormat(lang, {
    maximumFractionDigits: 2
  });
  const elevations = [ ...data.EW, ...data.SN ].map(p => p.elevationM).filter(Number.isFinite);
  if (!elevations.length) return '<section class="crater-profile"><h4>' + (data.dataset || "NASADEM") + '</h4><p>' + (en ? "No elevation samples are available for this site." : "No hay muestras de elevación disponibles para este sitio.") + "</p></section>";
  const low = Math.min(...elevations), high = Math.max(...elevations);
  const min = Math.floor(low / 10) * 10, range = Math.max(20, Math.ceil(high / 10) * 10 - min);
  const x = d => 55 + d / data.spanKm * 400, y = z => 205 - (z - min) / range * 150;
  const colors = [ "#00ddeb", "#ffc38c" ];
  const paths = [ "EW", "SN" ].map((dir, i) => {
    let drawing = false;
    const path = data[dir].map(p => {
      if (!Number.isFinite(p.elevationM)) {
        drawing = false;
        return "";
      }
      const command = drawing ? "L" : "M";
      drawing = true;
      return command + x(p.distanceKm).toFixed(2) + " " + y(p.elevationM).toFixed(2);
    }).join(" ");
    return '<path d="' + path + '" fill="none" stroke="' + colors[i] + '" stroke-width="2"/>';
  }).join("");
  let grid = "";
  for (let i = 0; i <= 3; i++) {
    const z = min + range * i / 3;
    grid += '<path d="M55 ' + y(z) + 'H455" stroke="#223b49"/><text x="48" y="' + (y(z) + 4) + '" text-anchor="end" fill="#98b4c3" font-size="10">' + f.format(z) + "</text>";
  }
  for (let i = 0; i <= 4; i++) grid += '<text x="' + (55 + i * 100) + '" y="225" text-anchor="middle" fill="#98b4c3" font-size="10">' + f.format(data.spanKm * i / 4) + "</text>";
  const exaggeration = 150 / range / (400 / data.spanKm) * 1e3;
  const polar = Boolean(data.dataset);
  const name = polar ? data.dataset : "NASADEM";
  const reference = polar ? (en ? "WGS84 ellipsoid" : "elipsoide WGS84") : "EGM96";
  const note = polar
    ? (en ? "Polar Geospatial Center stereo-derived surface model, bilinearly sampled. DEMs created by the Polar Geospatial Center from Vantor imagery. Grid spacing is not vertical accuracy; ice, snow and surface features may affect heights. These profiles do not establish impact origin or landing safety. Catalog elevations may use a different vertical reference." : "Modelo de superficie estereoscópico del Polar Geospatial Center, muestreado bilinealmente. DEM creado por el Polar Geospatial Center a partir de imágenes de Vantor. El paso de malla no equivale a precisión vertical; el hielo, la nieve y los elementos superficiales pueden afectar las cotas. Los perfiles no determinan origen de impacto ni seguridad de aterrizaje. Las cotas del catálogo pueden usar otra referencia vertical.")
    : (en ? "NASA JPL NASADEM HGT v001, bilinearly resampled from the public Planetary Computer copy. Grid spacing is not vertical accuracy. These profiles help compare terrain geometry; they do not identify blocks, confirm an impact origin, or establish base or landing safety. Catalog elevations retain their own source and may use a different vertical reference." : "NASA JPL NASADEM HGT v001, remuestreado bilinealmente desde la copia pública de Planetary Computer. El paso de malla no equivale a precisión vertical. Los perfiles ayudan a comparar geometría del terreno; no identifican bloques, confirman un origen de impacto ni determinan seguridad para una base o aterrizaje. Las cotas del catálogo conservan su fuente y pueden usar otra referencia vertical.");
  const gaps = elevations.length < data.EW.length + data.SN.length
    ? (en ? " Missing samples are shown as gaps." : " Las muestras sin datos se muestran como huecos.") : "";
  const sourceUrl = polar ? (name === "REMA" ? "https://www.pgc.umn.edu/data/rema/" : "https://www.pgc.umn.edu/data/arcticdem/") : "https://doi.org/10.5067/MEaSUREs/NASADEM/NASADEM_HGT.001";
  const sourceLabel = polar ? "Polar Geospatial Center · " + name : "NASA Earthdata · NASADEM HGT v001";
  return '<figure class="crater-profile earth-profile"><figcaption><strong>' + (en ? name + " terrain profiles" : "Perfiles del terreno " + name) + '</strong><span>' + (polar ? "v" + data.version + " · ~32 m" : "HGT v001 · ~30 m") + '</span></figcaption><svg viewBox="0 0 510 260" role="img" aria-label="' + (en ? "Measured terrestrial elevation profiles" : "Perfiles de elevación terrestre medidos") + '"><text x="55" y="18" fill="#a9becd" font-size="11">' + (en ? "Elevation (m, " : "Elevación (m, ") + reference + ")</text>" + grid + paths + '<path d="M255 40V205" stroke="#9cafb7" stroke-dasharray="4 4"/><text x="255" y="249" text-anchor="middle" fill="#a9becd" font-size="11">' + (en ? "Distance along transect (km)" : "Distancia a lo largo del transecto (km)") + '</text></svg><p><span style="color:' + colors[0] + '">' + (en ? "West–east" : "Oeste–este") + '</span> · <span style="color:' + colors[1] + '">' + (en ? "South–north" : "Sur–norte") + "</span></p><p>" + (en ? "Two 10 km transects around the catalog coordinate. Elevation range along these lines: " : "Dos transectos de 10 km alrededor de la coordenada del catálogo. Rango de elevación sobre estas líneas: ") + f.format(low) + "–" + f.format(high) + " m · " + (en ? "Relief: " : "Desnivel: ") + f.format(high - low) + " m.</p><p>" + (en ? "Sampling step: " : "Paso de muestreo: ") + f.format(data.stepKm * 1e3) + " m · " + (en ? "Vertical exaggeration: " : "Exageración vertical: ") + f.format(exaggeration) + '×.</p><p class="match-limit">' + note + gaps + '</p><a href="' + sourceUrl + '" target="_blank" rel="noopener">' + sourceLabel + " ↗</a></figure>";
}
