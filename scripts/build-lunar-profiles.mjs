import fs from "node:fs/promises";

import { gunzipSync } from "node:zlib";

import { lunarMatrix } from "../dist/assets/lunar-matrix.js";

const dir = process.argv[2];

if (!dir) throw Error("Indica la carpeta relief-data de origen");

const index = JSON.parse(await fs.readFile(dir + "/index.json", "utf8")), b = index.Moon.base, cache = new Map;

async function value(x, y) {
  x = (x % b.width + b.width) % b.width;
  y = Math.max(0, Math.min(b.height - 1, y));
  const cx = Math.floor(x / b.chunk), cy = Math.floor(y / b.chunk), key = cx + "-" + cy;
  if (!cache.has(key)) {
    const data = gunzipSync(await fs.readFile(dir + "/moon-" + key + ".bin.gz"));
    const v = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
    for (let i = b.chunk; i < v.length; i++) v[i] += v[i - b.chunk];
    for (let row = 0; row < b.chunk; row++) for (let i = row * b.chunk + 1; i < (row + 1) * b.chunk; i++) v[i] += v[i - 1];
    cache.set(key, v);
  }
  return cache.get(key)[y % b.chunk * b.chunk + x % b.chunk];
}

async function sample(lat, lon) {
  const x = ((lon - b.west) % 360 + 360) % 360 / b.dx, y = (b.north - lat) / b.dy;
  const x0 = Math.floor(x), y0 = Math.floor(y), a = await value(x0, y0), c = await value(x0, y0 + 1), bb = await value(x0 + 1, y0), d = await value(x0 + 1, y0 + 1);
  if ([ a, bb, c, d ].includes(-32768)) return null;
  return (a + (bb - a) * (x - x0)) * (1 - y + y0) + (c + (d - c) * (x - x0)) * (y - y0);
}

const profiles = {};

for (const row of lunarMatrix.flatMap(g => g.rows)) {
  const span = row.diameterKm * 1.4, n = Math.max(4, Math.ceil(span / 1.895));
  const directions = {};
  for (const [name, bearing] of [ [ "EW", Math.PI / 2 ], [ "SN", 0 ] ]) {
    const points = [];
    for (let i = 0; i <= n; i++) {
      const distance = (i / n - .5) * span, angle = distance / 1737.4, phi = row.lat * Math.PI / 180;
      const lat = Math.asin(Math.sin(phi) * Math.cos(angle) + Math.cos(phi) * Math.sin(angle) * Math.cos(bearing));
      const lon = row.lon + Math.atan2(Math.sin(bearing) * Math.sin(angle) * Math.cos(phi), Math.cos(angle) - Math.sin(phi) * Math.sin(lat)) * 180 / Math.PI;
      points.push({
        distanceKm: Number((i / n * span).toFixed(3)),
        elevationM: Math.round(await sample(lat * 180 / Math.PI, lon))
      });
    }
    directions[name] = points;
  }
  profiles[row.code] = {
    center: {
      lat: row.lat,
      lon: row.lon
    },
    spanKm: span,
    stepKm: span / n,
    resolutionM: 1895,
    ...directions
  };
}

await fs.writeFile(new URL("../dist/assets/lunar-profiles.js", import.meta.url), "// Derived from included LOLA LDEM_16, bilinear sampling.\nexport const lunarProfiles=" + JSON.stringify(profiles) + ";\n");

console.log(Object.keys(profiles).length + " perfiles dobles extraídos.");
