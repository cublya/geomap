import type { LineString } from "geojson";
import type { Coordinate, GeoRoute, LonLat } from "../types";
import { greatCirclePoints, toLonLat } from "./coords";

/** A point in projected SVG/canvas space. */
export type ScreenPoint = readonly [number, number];

/**
 * Sample a multi-stop route as one polyline: consecutive stops joined by
 * great-circle arcs, `samplesPerSegment` intervals each.
 */
export function routePoints(stops: readonly Coordinate[], samplesPerSegment = 48): LonLat[] {
  if (stops.length === 0) return [];
  if (stops.length === 1) return [toLonLat(stops[0]!)];
  const points: LonLat[] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const segment = greatCirclePoints(stops[i]!, stops[i + 1]!, samplesPerSegment);
    // Skip the first point of every segment after the first to avoid duplicates.
    points.push(...(i === 0 ? segment : segment.slice(1)));
  }
  return points;
}

/**
 * The same route as a GeoJSON LineString, ready for `geoPath` (d3 handles
 * antimeridian clipping on the sampled line).
 */
export function routeLineString(
  stops: readonly Coordinate[],
  samplesPerSegment = 48,
): LineString {
  return { type: "LineString", coordinates: routePoints(stops, samplesPerSegment) };
}

/** Build the route geometry selected by a route's optional geometry mode. */
export function routeGeometryLineString(route: Pick<GeoRoute, "stops" | "geometry">): LineString {
  if (route.geometry === "straight") {
    return { type: "LineString", coordinates: route.stops.map(toLonLat) };
  }
  return routeLineString(route.stops);
}

/** Project route stops, returning null when any stop cannot be rendered. */
export function projectRoutePoints(
  stops: readonly Coordinate[],
  project: (coordinate: Coordinate) => ScreenPoint | null,
): ScreenPoint[] | null {
  const points: ScreenPoint[] = [];
  for (const stop of stops) {
    const point = project(stop);
    if (!point || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) return null;
    points.push(point);
  }
  return points;
}

/** Control point for one screen-space bowed route segment. */
export function arcControlPoint(start: ScreenPoint, end: ScreenPoint, arc: number): ScreenPoint {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];

  // Select the perpendicular whose positive direction has the smaller screen y.
  const sign = dx >= 0 ? 1 : -1;
  return [
    (start[0] + end[0]) / 2 + (sign * dy * arc),
    (start[1] + end[1]) / 2 - (sign * dx * arc),
  ];
}

/** SVG path for one screen-space bowed route segment. */
export function arcPath(start: ScreenPoint, end: ScreenPoint, arc: number): string {
  const control = arcControlPoint(start, end, arc);
  return `M${start[0]},${start[1]}Q${control[0]},${control[1]} ${end[0]},${end[1]}`;
}

/** SVG path for projected route stops, as a polyline or consecutive bowed segments. */
export function screenRoutePath(points: readonly ScreenPoint[], arc?: number): string | null {
  if (points.length < 2) return null;
  if (arc) return points.slice(1).map((end, i) => arcPath(points[i]!, end, arc)).join("");
  return `M${points.map((point) => `${point[0]},${point[1]}`).join("L")}`;
}
