import fs from "node:fs/promises";

import { createHash } from "node:crypto";

import { PNG } from "pngjs";

import { analogs } from "../dist/assets/analogs.js";

const output = new URL("../dist/assets/earth-imagery/", import.meta.url);

await fs.mkdir(output, {
  recursive: true
});

const images = {};

for (const site of analogs) {
  const spanKm = 10, dy = spanKm / 2 / 111.195, dx = dy / Math.cos(site.lat * Math.PI / 180);
  const bbox = [ site.lon - dx, site.lat - dy, site.lon + dx, site.lat + dy ];
  let entry;
  for (const layer of [ "Landsat_WELD_CorrectedReflectance_TrueColor_Global_Annual", "MODIS_Terra_CorrectedReflectance_TrueColor" ]) {
    const params = new URLSearchParams({
      SERVICE: "WMS",
      REQUEST: "GetMap",
      VERSION: "1.1.1",
      LAYERS: layer,
      STYLES: "",
      FORMAT: "image/png",
      TRANSPARENT: "TRUE",
      SRS: "EPSG:4326",
      BBOX: bbox.join(","),
      WIDTH: "512",
      HEIGHT: "512"
    });
    params.set("TIME", layer.startsWith("Landsat") ? "2000-12-01" : "2024-01-15");
    const url = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?" + params;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(6e4)
    });
    if (!response.ok) throw Error(`${site.id}: HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const png = PNG.sync.read(buffer);
    let valid = 0;
    for (let p = 0; p < png.data.length; p += 4) if (png.data[p + 3] > 0 && png.data[p] + png.data[p + 1] + png.data[p + 2] > 5) valid++;
    if (valid / (png.width * png.height) < .95) continue;
    await fs.writeFile(new URL(site.id + ".png", output), buffer);
    entry = {
      file: "earth-imagery/" + site.id + ".png",
      layer: layer,
      time: params.get("TIME"),
      spanKm: spanKm,
      bbox: bbox,
      width: png.width,
      height: png.height,
      sourceURL: url,
      sha256: createHash("sha256").update(buffer).digest("hex")
    };
    break;
  }
  if (!entry) throw Error(site.id + ": no usable satellite coverage");
  images[site.id] = entry;
  console.log(site.id + ": " + entry.layer);
}

await fs.writeFile(new URL("../dist/assets/earth-imagery.js", import.meta.url), "export const earthImagery=" + JSON.stringify(images) + ";\n");
