import { writeFile } from "node:fs/promises";
import { fromUrl } from "geotiff";
import proj4 from "proj4";
import { analogs } from "../dist/assets/analogs.js";

const datasets = {
  mcmurdo: {
    name: "REMA",
    version: "2.0",
    collection: "rema-mosaics-v2.0-32m", epsg: 3031,
    projection: "+proj=stere +lat_0=-90 +lat_ts=-71 +lon_0=0 +datum=WGS84 +units=m +no_defs"
  },
  haughton: {
    name: "ArcticDEM",
    version: "3.0",
    collection: "arcticdem-mosaics-v3.0-32m", epsg: 3413,
    projection: "+proj=stere +lat_0=90 +lat_ts=70 +lon_0=-45 +datum=WGS84 +units=m +no_defs"
  },
  askja: {
    name: "ArcticDEM",
    version: "3.0",
    collection: "arcticdem-mosaics-v3.0-32m", epsg: 3413,
    projection: "+proj=stere +lat_0=90 +lat_ts=70 +lon_0=-45 +datum=WGS84 +units=m +no_defs"
  },
  barrow: {
    name: "ArcticDEM",
    version: "3.0",
    collection: "arcticdem-mosaics-v3.0-32m", epsg: 3413,
    projection: "+proj=stere +lat_0=90 +lat_ts=70 +lon_0=-45 +datum=WGS84 +units=m +no_defs"
  }
};

const size = 320, spanKm = 10;
const profiles = {};

for (const [id, dataset] of Object.entries(datasets)) {
  const site = analogs.find(item => item.id === id);
  if (!site) throw Error(`Missing catalog site: ${id}`);
  const dy = spanKm / 2 / 111.195, dx = dy / Math.cos(site.lat * Math.PI / 180);
  const bbox = [site.lon - dx, site.lat - dy, site.lon + dx, site.lat + dy];
  const profile = {
    center: [site.lat, site.lon], spanKm, stepKm: spanKm / size,
    resolutionM: 32, dataset: dataset.name, version: dataset.version,
    verticalReference: "WGS84", EW: [], SN: [], sources: []
  };
  const samples = [];
  for (const dir of ["EW", "SN"]) {
    for (let i = 0; i < size; i++) {
      const offset = (i + 0.5) / size * 2 - 1;
      const lon = site.lon + (dir === "EW" ? dx * offset : 0);
      const lat = site.lat + (dir === "SN" ? dy * offset : 0);
      const point = { distanceKm: +(spanKm * (i + 0.5) / size).toFixed(5), elevationM: null };
      profile[dir].push(point);
      samples.push({ point, xy: proj4("WGS84", dataset.projection, [lon, lat]) });
    }
  }
  let url = `https://stac.pgc.umn.edu/api/v1/collections/${dataset.collection}/items?bbox=${bbox.join(",")}&limit=100`;
  const items = [];
  while (url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw Error(`STAC ${response.status}: ${url}`);
    const page = await response.json();
    items.push(...page.features);
    url = page.links.find(link => link.rel === "next")?.href;
  }
  const tiles = [];
  for (const item of items.sort((a, b) => a.id.localeCompare(b.id))) {
    const source = item.assets.dem?.href;
    if (!source) throw Error(`Missing DEM asset: ${item.id}`);
    const tiff = await fromUrl(source);
    try {
      const image = await tiff.getImage();
      const [ox, oy] = image.getOrigin(), [sx, sy] = image.getResolution();
      if (image.getGeoKeys().ProjectedCSTypeGeoKey !== dataset.epsg ||
        image.getGDALNoData() !== -9999 || Math.abs(sx - 32) > 0.01 || Math.abs(sy + 32) > 0.01) {
        throw Error(`Unexpected raster grid: ${item.id}`);
      }
      const width = image.getWidth(), height = image.getHeight(), nodata = image.getGDALNoData();
      const candidates = samples.map(sample => ({
        ...sample, px: (sample.xy[0] - ox) / sx - 0.5, py: (sample.xy[1] - oy) / sy - 0.5
      })).filter(sample => sample.px >= -1 && sample.py >= -1 &&
        sample.px < width && sample.py < height);
      if (!candidates.length) continue;
      const x0 = Math.max(0, Math.floor(Math.min(...candidates.map(p => p.px))));
      const y0 = Math.max(0, Math.floor(Math.min(...candidates.map(p => p.py))));
      const x1 = Math.min(width, Math.floor(Math.max(...candidates.map(p => p.px))) + 2);
      const y1 = Math.min(height, Math.floor(Math.max(...candidates.map(p => p.py))) + 2);
      const raster = (await image.readRasters({ window: [x0, y0, x1, y1], samples: [0] }))[0];
      tiles.push({ item: item.id, url: source, ox, oy, sx, sy, width, height, nodata, x0, y0, x1, y1, raster });
    } finally {
      await tiff.close();
    }
    for (const tile of tiles) {
      if (tiles.some(other => Math.abs((tile.ox - other.ox) / tile.sx - Math.round((tile.ox - other.ox) / tile.sx)) > 1e-6 ||
        Math.abs((tile.oy - other.oy) / tile.sy - Math.round((tile.oy - other.oy) / tile.sy)) > 1e-6)) {
        throw Error(`Misaligned source grids: ${id}`);
      }
    }
    const used = new Set();
    for (const sample of samples) {
      const tile = tiles.find(t => sample.xy[0] >= t.ox && sample.xy[0] < t.ox + t.width * t.sx &&
        sample.xy[1] <= t.oy && sample.xy[1] > t.oy + t.height * t.sy);
      if (!tile) continue;
      const px = (sample.xy[0] - tile.ox) / tile.sx - 0.5, py = (sample.xy[1] - tile.oy) / tile.sy - 0.5;
      const x = Math.floor(px), y = Math.floor(py), fx = px - x, fy = py - y;
      const contributors = [];
      const z = [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]].map(([col, row]) => {
        const worldX = tile.ox + (col + 0.5) * tile.sx, worldY = tile.oy + (row + 0.5) * tile.sy;
        for (const t of tiles) {
          const tx = Math.round((worldX - t.ox) / t.sx - 0.5), ty = Math.round((worldY - t.oy) / t.sy - 0.5);
          if (tx < t.x0 || tx >= t.x1 || ty < t.y0 || ty >= t.y1) continue;
          const value = t.raster[(ty - t.y0) * (t.x1 - t.x0) + tx - t.x0];
          if (Number.isFinite(value) && value !== t.nodata) {
            contributors.push(t);
            return value;
          }
        }
        return null;
      });
      if (z.some(value => value === null)) continue;
      sample.point.elevationM = Math.round((z[0] * (1 - fx) + z[1] * fx) * (1 - fy) +
        (z[2] * (1 - fx) + z[3] * fx) * fy);
      for (const contributor of contributors) used.add(contributor);
    }
    profile.sources = [...used].map(({ item, url }) => ({ item, url }));
  }
  if (!profile.sources.length) throw Error(`No valid elevations for ${id}`);
  console.log(`${id}: ${samples.filter(s => s.point.elevationM !== null).length}/${samples.length} samples`);
  profiles[id] = profile;
}

await writeFile(new URL("../dist/assets/polar-profiles.js", import.meta.url),
  "export const polarProfiles=" + JSON.stringify(profiles) + ";\n");
