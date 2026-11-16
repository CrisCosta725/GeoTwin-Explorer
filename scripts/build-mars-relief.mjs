import { createHash } from "node:crypto";
import sharp from 'sharp';

import { readFile, writeFile } from "node:fs/promises";

import { deflateSync } from "node:zlib";

const source = process.argv[2];

if (!source) throw new Error("Usage: node scripts/build-mars-relief.mjs path-to-megt90n000eb.img");

const input = await readFile(source);

const checksum = createHash("md5").update(input).digest("hex");

if (input.length !== 5760 * 2880 * 2 || checksum !== "357c759ab342140d2d008443e0a68015") throw new Error("Input does not match the PDS MEGT90N000EB product.");

const width = 2880, height = 1440;

const elevations = new Float32Array(width * height);

const elevationGrid = Buffer.alloc(width * height * 2);

for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const sx = (x + width / 2) % width * 2;
  const offset = (y * 2 * 5760 + sx) * 2;
  elevations[y * width + x] = (input.readInt16BE(offset) + input.readInt16BE(offset + 2) + input.readInt16BE(offset + 11520) + input.readInt16BE(offset + 11522)) / 4;
  elevationGrid.writeInt16BE(Math.round(elevations[y * width + x]), (y * width + x) * 2);
}

const colors = [ [ -8e3, [ 53, 38, 42 ] ], [ -4e3, [ 95, 55, 48 ] ], [ 0, [ 148, 80, 57 ] ], [ 4e3, [ 189, 112, 75 ] ], [ 8e3, [ 215, 150, 103 ] ], [ 12e3, [ 230, 187, 142 ] ], [ 22e3, [ 248, 226, 190 ] ] ];

const raw = Buffer.alloc((width * 3 + 1) * height);

for (let y = 0; y < height; y++) {
  const cosLat = Math.max(.2, Math.cos((90 - (y + .5) / 8) * Math.PI / 180));
  for (let x = 0; x < width; x++) {
    const i = y * width + x, elevation = elevations[i];
    const west = elevations[y * width + (x + width - 1) % width];
    const east = elevations[y * width + (x + 1) % width];
    const north = elevations[Math.max(0, y - 1) * width + x];
    const south = elevations[Math.min(height - 1, y + 1) * width + x];
    const dx = (east - west) / (14818 * cosLat), dy = (south - north) / 14818;
    const shade = Math.max(.55, Math.min(1.25, 1 + 1.8 * (dy - dx)));
    let stop = 1;
    while (stop < colors.length - 1 && elevation > colors[stop][0]) stop++;
    const [low, lowColor] = colors[stop - 1], [high, highColor] = colors[stop];
    const mix = Math.max(0, Math.min(1, (elevation - low) / (high - low)));
    const out = y * (width * 3 + 1) + 1 + x * 3;
    for (let c = 0; c < 3; c++) raw[out + c] = Math.round(Math.min(255, (lowColor[c] * (1 - mix) + highColor[c] * mix) * shade));
  }
}

function crc32(data) {
  let crc = 4294967295;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = crc >>> 1 ^ 3988292384 & -(crc & 1);
  }
  return (crc ^ 4294967295) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type), length = Buffer.alloc(4), crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([ name, data ])));
  return Buffer.concat([ length, name, data, crc ]);
}

const header = Buffer.alloc(13);

header.writeUInt32BE(width, 0);

header.writeUInt32BE(height, 4);

header[8] = 8;

header[9] = 2;

const png = Buffer.concat([ Buffer.from([ 137, 80, 78, 71, 13, 10, 26, 10 ]), chunk("IHDR", header), chunk("IDAT", deflateSync(raw, {
  level: 9
})), chunk("IEND", Buffer.alloc(0)) ]);

const output = new URL("../dist/assets/mars-relief.webp", import.meta.url);

await writeFile(output, await sharp(png).webp({quality:90,effort:6}).toBuffer());

await writeFile(new URL("../dist/assets/mars-elevation.bin", import.meta.url), elevationGrid);

console.log(`Created ${output.pathname}: ${width} x ${height}`);
