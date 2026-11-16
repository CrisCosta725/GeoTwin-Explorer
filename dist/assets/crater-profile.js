import { lunarProfiles } from "./lunar-profiles.js";

export function craterProfile(row, lang = "es") {
  const data = lunarProfiles[row?.code];
  if (!data) return "";
  const en = lang === "en", f = new Intl.NumberFormat(lang, {
    maximumFractionDigits: 2
  });
  const values = [ ...data.EW, ...data.SN ].map(p => p.elevationM).filter(Number.isFinite);
  if (!values.length) return "";
  const min = Math.floor(Math.min(...values) / 100) * 100, max = Math.ceil(Math.max(...values) / 100) * 100;
  const sx = 400 / data.spanKm, range = Math.max(100, max - min), sy = 150 / range;
  const x = d => 55 + d * sx, y = z => 205 - (z - min) * sy;
  const paths = [ "EW", "SN" ].map((dir, i) => '<path d="' + data[dir].map((p, j) => (j ? "L" : "M") + x(p.distanceKm).toFixed(2) + " " + y(p.elevationM).toFixed(2)).join(" ") + '" fill="none" stroke="' + (i ? "#ffc38c" : "#00ddeb") + '" stroke-width="2"/>' + data[dir].map(p => '<circle cx="' + x(p.distanceKm) + '" cy="' + y(p.elevationM) + '" r="2" fill="' + (i ? "#ffc38c" : "#00ddeb") + '"/>').join("")).join("");
  let grid = "";
  for (let i = 0; i <= 3; i++) {
    const z = min + range * i / 3;
    grid += '<path d="M55 ' + y(z) + 'H455" stroke="#223b49"/><text x="48" y="' + (y(z) + 4) + '" text-anchor="end" fill="#98b4c3" font-size="10">' + Math.round(z) + "</text>";
  }
  for (let i = 0; i <= 4; i++) grid += '<text x="' + (55 + i * 100) + '" y="225" text-anchor="middle" fill="#98b4c3" font-size="10">' + f.format(data.spanKm * i / 4) + "</text>";
  const exaggeration = sy * 1e3 / sx;
  return '<figure class="crater-profile"><figcaption><strong>' + (en ? "LOLA topographic transects" : "Transectos topográficos LOLA") + "</strong><span>" + row.code + '</span></figcaption><svg viewBox="0 0 510 260" role="img" aria-label="' + (en ? "Elevation sampled from lunar DEM" : "Elevación muestreada del DEM lunar") + '"><text x="55" y="18" fill="#a9becd" font-size="11">' + (en ? "Elevation (m)" : "Elevación (m)") + "</text>" + grid + paths + '<path d="M255 40V205" stroke="#9cafb7" stroke-dasharray="4 4"/><text x="255" y="249" text-anchor="middle" fill="#a9becd" font-size="11">' + (en ? "Distance along transect (km)" : "Distancia a lo largo del transecto (km)") + '</text></svg><p><span style="color:#00ddeb">' + (en ? "West–east" : "Oeste–este") + '</span> · <span style="color:#ffc38c">' + (en ? "South–north" : "Sur–norte") + "</span></p><p>" + (en ? "Both lines cross the supplied coordinate. Dots are bilinearly interpolated DEM samples, not individual laser returns." : "Las dos líneas atraviesan la coordenada aportada. Los puntos son muestras interpoladas del DEM, no retornos individuales del láser.") + "</p><p>" + (en ? "Grid spacing: " : "Malla: ") + data.resolutionM + " m · " + (en ? "Sampling step: " : "Paso de muestreo: ") + f.format(data.stepKm) + " km · " + (en ? "Vertical exaggeration: " : "Exageración vertical: ") + f.format(exaggeration) + '×.</p><p class="match-limit">' + (en ? "LOLA LDEM_16 regional model, referenced to a lunar radius of 1,737.4 km. Small craters are poorly resolved. The supplied center and diameter may not match the topographic rim. These transects do not establish maximum crater depth or landing safety; supplied matrix dimensions remain separate." : "Modelo regional LOLA LDEM_16, referido al radio lunar de 1737,4 km. Los cráteres pequeños quedan poco resueltos. El centro y diámetro aportados pueden no coincidir con el borde topográfico. Estos transectos no determinan la profundidad máxima del cráter ni seguridad de alunizaje; las dimensiones de la matriz permanecen separadas.") + '</p><a href="https://pds-geosciences.wustl.edu/missions/lro/lola.htm" target="_blank" rel="noopener">NASA PDS · LRO LOLA ↗</a></figure>';
}
