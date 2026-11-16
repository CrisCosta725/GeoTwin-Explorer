import fs from "node:fs/promises";
import sharp from 'sharp';

import { gunzipSync, deflateSync } from "node:zlib";

const dir = process.argv[2];

if (!dir) throw Error("Indica relief-data");

const b = JSON.parse(await fs.readFile(dir + "/index.json", "utf8")).Earth.base;

const values = new Int16Array(b.width * b.height);

for (let cy = 0; cy < Math.ceil(b.height / b.chunk); cy++) for (let cx = 0; cx < Math.ceil(b.width / b.chunk); cx++) {
  const raw = gunzipSync(await fs.readFile(dir + "/earth-" + cx + "-" + cy + ".bin.gz"));
  const v = new Int16Array(raw.buffer, raw.byteOffset, raw.byteLength / 2);
  const w = Math.min(b.chunk, b.width - cx * b.chunk), h = Math.min(b.chunk, b.height - cy * b.chunk);
  for (let i = w; i < v.length; i++) v[i] += v[i - w];
  for (let r = 0; r < h; r++) for (let i = r * w + 1; i < (r + 1) * w; i++) v[i] += v[i - 1];
  for (let y = 0; y < h; y++) values.set(v.subarray(y * w, (y + 1) * w), (cy * b.chunk + y) * b.width + cx * b.chunk);
}

const stops = [ [ -11e3, [ 4, 17, 50 ] ], [ -6e3, [ 10, 47, 95 ] ], [ -1e3, [ 38, 116, 155 ] ], [ 0, [ 86, 164, 171 ] ], [ 1, [ 76, 131, 76 ] ], [ 800, [ 169, 180, 107 ] ], [ 2500, [ 172, 127, 79 ] ], [ 4500, [ 191, 171, 146 ] ], [ 7e3, [ 242, 242, 237 ] ], [ 9e3, [ 255, 255, 255 ] ] ];

function color(z) {
  let i = 1;
  while (i < stops.length - 1 && z > stops[i][0]) i++;
  const [a, c] = stops[i - 1], [d, e] = stops[i], f = Math.max(0, Math.min(1, (z - a) / (d - a)));
  return c.map((n, j) => n + (e[j] - n) * f);
}

const scan = Buffer.alloc((b.width * 3 + 1) * b.height);

for (let y = 0; y < b.height; y++) for (let x = 0; x < b.width; x++) {
  const z = values[y * b.width + x], east = values[y * b.width + (x + 1) % b.width] - values[y * b.width + (x + b.width - 1) % b.width], north = values[Math.max(0, y - 1) * b.width + x] - values[Math.min(b.height - 1, y + 1) * b.width + x];
  const shade = Math.max(.55, Math.min(1.2, 1 + (-east + north) / 6e3));
  const c = color(z);
  const p = y * (b.width * 3 + 1) + 1 + x * 3;
  for (let j = 0; j < 3; j++) scan[p + j] = Math.round(Math.min(255, c[j] * shade));
}

function crc(buf) {
  let c = 4294967295;
  for (const byte of buf) {
    c ^= byte;
    for (let i = 0; i < 8; i++) c = c >>> 1 ^ (c & 1 ? 3988292384 : 0);
  }
  return (c ^ 4294967295) >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([ Buffer.from(type), data ]), out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length);
  body.copy(out, 4);
  out.writeUInt32BE(crc(body), out.length - 4);
  return out;
}

const header = Buffer.alloc(13);

header.writeUInt32BE(b.width);

header.writeUInt32BE(b.height, 4);

header[8] = 8;

header[9] = 2;

await sharp(Buffer.concat([ Buffer.from([ 137, 80, 78, 71, 13, 10, 26, 10 ]), chunk("IHDR", header), chunk("IDAT", deflateSync(scan)), chunk("IEND", Buffer.alloc(0)) ])).webp({quality:90,effort:6}).toFile('dist/assets/earth-relief.webp');

await fs.writeFile("dist/assets/earth-relief-provenance.json", JSON.stringify({
  source: "NOAA ETOPO · existing local derived grid",
  sourceURL: "https://www.ncei.noaa.gov/products/etopo-global-relief-model",
  grid: b,
  visualization: "Hypsometric and bathymetric color with illustrative hillshade. Not displaced geometry or engineering-resolution data."
}, null, 2));

console.log("Relieve generado " + b.width + " × " + b.height + "; paso " + b.dx + " grados.");
