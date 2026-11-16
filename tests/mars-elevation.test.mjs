import test from "node:test";

import assert from "node:assert/strict";

import { readFile } from "node:fs/promises";

import { marsElevation, sampleMarsElevation, sampleMarsTransects } from "../dist/assets/mars-elevation.js";

import { marsProfile } from "../dist/assets/mars-profile.js";

test("MOLA grid samples coordinates, wraps longitude and handles the poles", () => {
  const buffer = new ArrayBuffer(2880 * 1440 * 2);
  const data = new DataView(buffer);
  data.setInt16(0, 1234);
  data.setInt16((1440 * 2880 - 1) * 2, -4321);
  assert.equal(sampleMarsElevation(buffer, 90, -180), 1234);
  assert.equal(sampleMarsElevation(buffer, 90, 180), 1234);
  assert.equal(sampleMarsElevation(buffer, -90, 179.99), -4321);
  assert.throws(() => sampleMarsElevation(buffer, 91, 0), RangeError);
  assert.throws(() => sampleMarsElevation(buffer, 0, NaN), RangeError);
  assert.throws(() => sampleMarsElevation(new ArrayBuffer(2), 0, 0), /grid size/);
});

test("installed MOLA grid preserves high and low terrain at known locations", async () => {
  const data = await readFile(new URL("../dist/assets/mars-elevation.bin", import.meta.url));
  const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  assert.ok(sampleMarsElevation(buffer, 18.65, 226.2) > 19e3);
  assert.ok(sampleMarsElevation(buffer, -42.4, 70.5) < -5e3);
  for (const [lat, lon] of [ [ 18.65, 226.2 ], [ -42.4, 70.5 ], [ 90, 180 ], [ -90, -180 ] ]) {
    const profile = sampleMarsTransects(buffer, lat, lon);
    for (const direction of [ "EW", "SN" ]) {
      assert.equal(profile[direction].length, 41);
      assert.equal(profile[direction][20].elevationM, sampleMarsElevation(buffer, lat, lon));
      assert.equal(profile[direction][40].distanceKm, 200);
      assert.ok(profile[direction].every(point => Number.isFinite(point.elevationM)));
    }
    assert.match(marsProfile(profile, "en"), /Topographic transects/);
    assert.match(marsProfile(profile, "es"), /Transectos topográficos/);
  }
});

test("failed grid downloads report errors and can be retried", async () => {
  const originalFetch = globalThis.fetch;
  const grid = new ArrayBuffer(2880 * 1440 * 2);
  let calls = 0;
  globalThis.fetch = async () => ++calls === 1 ? {
    ok: false,
    status: 503
  } : {
    ok: true,
    arrayBuffer: async () => grid
  };
  try {
    await assert.rejects(marsElevation(0, 0), /503/);
    assert.equal(await marsElevation(0, 0), 0);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
