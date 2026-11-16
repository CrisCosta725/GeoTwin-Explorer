const width = 2880, height = 1440;

let gridPromise;

export function sampleMarsElevation(buffer, lat, lon) {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon)) throw new RangeError("Invalid Mars coordinates");
  if (buffer.byteLength !== width * height * 2) throw new Error("Invalid MOLA elevation grid size");
  const x = Math.floor(((lon + 180) % 360 + 360) % 360 / 360 * width);
  const y = Math.min(height - 1, Math.floor((90 - lat) / 180 * height));
  return new DataView(buffer).getInt16((y * width + x) * 2);
}

function loadGrid() {
  gridPromise ??= Promise.resolve().then(() => fetch(new URL("mars-elevation.bin", import.meta.url))).then(response => {
    if (!response.ok) throw new Error("MOLA elevation grid request failed: " + response.status);
    return response.arrayBuffer();
  }).then(buffer => {
    if (buffer.byteLength !== width * height * 2) throw new Error("Invalid MOLA elevation grid size");
    return buffer;
  }).catch(error => {
    gridPromise = void 0;
    throw error;
  });
  return gridPromise;
}

export function marsElevation(lat, lon) {
  return loadGrid().then(buffer => sampleMarsElevation(buffer, lat, lon));
}

export function sampleMarsTransects(buffer, lat, lon) {
  const spanKm = 200, stepKm = 5, radiusKm = 3396, rad = Math.PI / 180;
  sampleMarsElevation(buffer, lat, lon);
  const phi = lat * rad, lambda = lon * rad;
  function point(distance, bearing) {
    if (distance === 0) return sampleMarsElevation(buffer, lat, lon);
    const angular = Math.abs(distance) / radiusKm;
    const azimuth = (bearing + (distance < 0 ? 180 : 0)) * rad;
    const latitude = Math.asin(Math.max(-1, Math.min(1, Math.sin(phi) * Math.cos(angular) + Math.cos(phi) * Math.sin(angular) * Math.cos(azimuth))));
    const longitude = lambda + Math.atan2(Math.sin(azimuth) * Math.sin(angular) * Math.cos(phi), Math.cos(angular) - Math.sin(phi) * Math.sin(latitude));
    return sampleMarsElevation(buffer, latitude / rad, longitude / rad);
  }
  const line = bearing => Array.from({
    length: spanKm / stepKm + 1
  }, (_, i) => {
    const distanceKm = i * stepKm;
    return {
      distanceKm: distanceKm,
      elevationM: point(distanceKm - spanKm / 2, bearing)
    };
  });
  return {
    spanKm: spanKm,
    stepKm: stepKm,
    EW: line(90),
    SN: line(0)
  };
}

export function marsTransects(lat, lon) {
  return loadGrid().then(buffer => sampleMarsTransects(buffer, lat, lon));
}
