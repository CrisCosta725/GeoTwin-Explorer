import { earthProfiles } from "./earth-profiles.js";
import { polarProfiles } from "./polar-profiles.js";

// LDEM_16 V3.1, bilinearly sampled at the catalog coordinates.
const lunarElevations = {
  apollo: [ .674, 23.473, -1922 ],
  csn215: [ -67.5982, 32.792, 523 ],
  csn216: [ -64.436, 22.6303, -1538 ],
  csn217: [ -63.6761, 24.1139, -1544 ],
  csn218: [ -64.0839, 19.6388, -1589 ],
  csn202: [ -62.5883, -28.3924, -1730 ],
  csn201: [ -60.7218, -32.3034, -1864 ],
  cse37: [ 13.9767, -47.6443, -2709 ],
  cse47: [ 16.3314, -47.3517, -2804 ],
  cse03: [ -24.2276, -24.6792, -4003 ],
  cse16: [ -6.9516, 50.4371, -3217 ],
  cse07: [ -.8143, 15.4192, -3309 ],
  csc13: [ 23.7299, -47.4901, -3167 ],
  csc16: [ 4.181, 3.5988, -2213 ],
  csc25: [ 16.2593, 15.9294, -3752 ],
  csc19: [ 21.7342, 17.9204, -3648 ],
  csc06: [ -79.40668, 24.04089, 1165 ]
};

function sameCoordinates(site, lat, lon) {
  return Math.abs(site.lat - lat) < 1e-6 && Math.abs(site.lon - lon) < 1e-6;
}

function centerElevation(profile) {
  const center = profile.spanKm / 2;
  const line = profile.EW;
  if (!Array.isArray(line)) return null;
  const i = line.findIndex(point => point.distanceKm >= center);
  if (i < 0) return null;
  const right = line[i];
  if (!Number.isFinite(right.elevationM)) return null;
  if (right.distanceKm === center) return right.elevationM;
  const left = line[i - 1];
  if (!left || !Number.isFinite(left.elevationM) || right.distanceKm <= left.distanceKm) return null;
  return left.elevationM + (right.elevationM - left.elevationM) * (center - left.distanceKm) / (right.distanceKm - left.distanceKm);
}

export function catalogElevation(world, site) {
  if (world === "Earth") {
    if (Number.isFinite(site.elevationM)) return { value: site.elevationM, source: "supplied" };
    const profile = polarProfiles[site.id] || earthProfiles[site.id];
    if (!profile || profile.unavailable || !Array.isArray(profile.center) || !sameCoordinates(site, ...profile.center)) return null;
    const value = centerElevation(profile);
    return Number.isFinite(value) ? { value: Math.round(value), source: profile.dataset || "NASADEM" } : null;
  }
  if (world === "Moon") {
    const sample = lunarElevations[site.id];
    if (sample && sameCoordinates(site, sample[0], sample[1])) return { value: sample[2], source: "LOLA" };
  }
  return null;
}
