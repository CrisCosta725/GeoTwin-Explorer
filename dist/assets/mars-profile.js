export function marsProfile(data, lang = "es") {
  const en = lang === "en", f = new Intl.NumberFormat(lang, {
    maximumFractionDigits: 2
  });
  const values = [ ...data.EW, ...data.SN ].map(p => p.elevationM);
  const min = Math.floor(Math.min(...values) / 100) * 100, max = Math.ceil(Math.max(...values) / 100) * 100;
  const range = Math.max(100, max - min), sx = 400 / data.spanKm, sy = 150 / range;
  const x = d => 55 + d * sx, y = z => 205 - (z - min) * sy;
  const paths = [ "EW", "SN" ].map((dir, i) => {
    const color = i ? "#ffc38c" : "#00ddeb";
    return '<path d="' + data[dir].map((p, j) => (j ? "L" : "M") + x(p.distanceKm).toFixed(2) + " " + y(p.elevationM).toFixed(2)).join(" ") + '" fill="none" stroke="' + color + '" stroke-width="2"/>' + data[dir].map(p => '<circle cx="' + x(p.distanceKm).toFixed(2) + '" cy="' + y(p.elevationM).toFixed(2) + '" r="2" fill="' + color + '"/>').join("");
  }).join("");
  let grid = "";
  for (let i = 0; i <= 3; i++) {
    const z = min + range * i / 3;
    grid += '<path d="M55 ' + y(z) + 'H455" stroke="#223b49"/><text x="48" y="' + (y(z) + 4) + '" text-anchor="end" fill="#98b4c3" font-size="10">' + f.format(Math.round(z)) + "</text>";
  }
  for (let i = 0; i <= 4; i++) grid += '<text x="' + (55 + i * 100) + '" y="225" text-anchor="middle" fill="#98b4c3" font-size="10">' + f.format(data.spanKm * i / 4) + "</text>";
  const exaggeration = sy * 1e3 / sx;
  return '<figure class="crater-profile mars-profile"><figcaption><strong>' + (en ? "Topographic transects" : "Transectos topográficos") + "</strong><span>" + (en ? "Regional context · 200 km" : "Contexto regional · 200 km") + '</span></figcaption><svg viewBox="0 0 510 260" role="img" aria-label="' + (en ? "Regional elevation transects of Mars" : "Transectos regionales de elevación de Marte") + '"><text x="55" y="18" fill="#a9becd" font-size="11">' + (en ? "Elevation (m, areoid)" : "Elevación (m, areoide)") + "</text>" + grid + paths + '<path d="M255 40V205" stroke="#9cafb7" stroke-dasharray="4 4"/><text x="255" y="249" text-anchor="middle" fill="#a9becd" font-size="11">' + (en ? "Distance along transect (km)" : "Distancia a lo largo del transecto (km)") + '</text></svg><p><span style="color:#00ddeb">' + (en ? "West–east" : "Oeste–este") + '</span> · <span style="color:#ffc38c">' + (en ? "South–north" : "Sur–norte") + "</span></p><p>" + (en ? "Both great-circle transects cross the selected coordinate. Each point uses its nearest grid cell." : "Ambos transectos de círculo máximo cruzan la coordenada seleccionada. Cada punto usa la celda de malla que lo contiene.") + "</p><p>" + (en ? "Sampling step: " : "Paso de muestreo: ") + f.format(data.stepKm) + " km · " + (en ? "Vertical exaggeration: " : "Exageración vertical: ") + f.format(exaggeration) + '×.</p><p class="match-limit">' + (en ? "Global grid averaged to 0.125° (~7.4 km north–south). Some original cells are interpolated. The sampling step is finer than the grid and does not add detail. This regional view cannot resolve small landforms or determine landing safety; the 200 km window is not a feature diameter." : "Malla global promediada a 0,125° (~7,4 km norte–sur). Algunas celdas originales son interpoladas. El paso de muestreo es menor que la malla y no añade detalle. Esta vista regional no resuelve formas pequeñas ni determina seguridad de aterrizaje; la ventana de 200 km no es el diámetro de un rasgo.") + "</p></figure>";
}
