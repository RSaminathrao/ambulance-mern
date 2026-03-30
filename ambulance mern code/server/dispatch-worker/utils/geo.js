function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineKm(a, b) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return earthRadiusKm * c;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function isInsideBbox(point, bbox) {
  return (
    point.lat >= bbox.minLat &&
    point.lat <= bbox.maxLat &&
    point.lon >= bbox.minLon &&
    point.lon <= bbox.maxLon
  );
}

function normalizePointToBbox(point, bbox) {
  return {
    lat: clamp(point.lat, bbox.minLat, bbox.maxLat),
    lon: clamp(point.lon, bbox.minLon, bbox.maxLon),
  };
}

function hashSeed(seed) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  const hash = hashSeed(seed);
  return hash / 4294967295;
}

function deterministicPointInBbox(seed, bbox) {
  const randLat = seededRandom(`${seed}:lat`);
  const randLon = seededRandom(`${seed}:lon`);

  return {
    lat: bbox.minLat + randLat * (bbox.maxLat - bbox.minLat),
    lon: bbox.minLon + randLon * (bbox.maxLon - bbox.minLon),
  };
}

module.exports = {
  haversineKm,
  clamp,
  isInsideBbox,
  normalizePointToBbox,
  deterministicPointInBbox,
};
