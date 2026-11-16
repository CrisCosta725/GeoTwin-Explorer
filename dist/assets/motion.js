export function damp(current, target, elapsedMs, responseMs = 160) {
  return current + (target - current) * -Math.expm1(-Math.max(0, Math.min(elapsedMs, 64)) / responseMs);
}

export function angleDelta(current, target) {
  return ((target - current + 540) % 360 + 360) % 360 - 180;
}
