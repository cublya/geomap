import type { Coordinate, GeoBounds, LonLat } from "../types";

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const EARTH_RADIUS_KM = 6371;

export function toLonLat(c: Coordinate): LonLat {
  if (Array.isArray(c)) return [c[0], c[1]];
  if ("lng" in c) return [c.lng, c.lat];
  return [c.lon, c.lat];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function haversineKm(a: Coordinate, b: Coordinate): number {
  const [lon1, lat1] = toLonLat(a);
  const [lon2, lat2] = toLonLat(b);
  const dLat = (lat2 - lat1) * RAD;
  const dLon = (lon2 - lon1) * RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from a to b: degrees, 0 = north, clockwise. */
export function bearingBetween(a: Coordinate, b: Coordinate): number {
  const [lon1, lat1] = toLonLat(a);
  const [lon2, lat2] = toLonLat(b);
  const dLon = (lon2 - lon1) * RAD;
  const y = Math.sin(dLon) * Math.cos(lat2 * RAD);
  const x =
    Math.cos(lat1 * RAD) * Math.sin(lat2 * RAD) -
    Math.sin(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.cos(dLon);
  return (Math.atan2(y, x) * DEG + 360) % 360;
}

/** Central angle between two points, in radians. */
export function angularDistance(a: Coordinate, b: Coordinate): number {
  return haversineKm(a, b) / EARTH_RADIUS_KM;
}

function toVector([lon, lat]: LonLat): [number, number, number] {
  const λ = lon * RAD;
  const φ = lat * RAD;
  return [Math.cos(φ) * Math.cos(λ), Math.cos(φ) * Math.sin(λ), Math.sin(φ)];
}

function toLonLatFromVector([x, y, z]: [number, number, number]): LonLat {
  return [Math.atan2(y, x) * DEG, Math.atan2(z, Math.hypot(x, y)) * DEG];
}

/** Spherical linear interpolation along the great circle from a (t=0) to b (t=1). */
export function interpolateGreatCircle(a: Coordinate, b: Coordinate, t: number): LonLat {
  const p = toLonLat(a);
  const q = toLonLat(b);
  const δ = angularDistance(p, q);
  if (δ < 1e-9) return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  const sinδ = Math.sin(δ);
  const A = Math.sin((1 - t) * δ) / sinδ;
  const B = Math.sin(t * δ) / sinδ;
  const va = toVector(p);
  const vb = toVector(q);
  return toLonLatFromVector([
    A * va[0] + B * vb[0],
    A * va[1] + B * vb[1],
    A * va[2] + B * vb[2],
  ]);
}

/** n + 1 points sampled along the great circle from a to b. */
export function greatCirclePoints(a: Coordinate, b: Coordinate, n = 64): LonLat[] {
  const points: LonLat[] = [];
  for (let i = 0; i <= n; i++) points.push(interpolateGreatCircle(a, b, i / n));
  return points;
}

/** Axis-aligned geographic bbox of a set of coordinates (no antimeridian splitting). */
export function geographicBounds(coords: readonly Coordinate[]): GeoBounds {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const c of coords) {
    const [lon, lat] = toLonLat(c);
    if (lon < west) west = lon;
    if (lon > east) east = lon;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  }
  return [
    [west, south],
    [east, north],
  ];
}

/** Mean position of coordinates on the sphere (3D vector average). */
export function sphericalCentroid(coords: readonly Coordinate[]): LonLat {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const c of coords) {
    const v = toVector(toLonLat(c));
    x += v[0];
    y += v[1];
    z += v[2];
  }
  const len = Math.hypot(x, y, z);
  if (len < 1e-9) return [0, 0];
  return toLonLatFromVector([x / len, y / len, z / len]);
}

/** Shortest signed angular difference from a to b, in degrees (-180, 180]. */
export function shortestAngleDelta(a: number, b: number): number {
  let d = (b - a) % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}
