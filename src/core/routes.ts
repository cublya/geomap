import type { LineString } from "geojson";
import type { Coordinate, GeoRoute, LonLat } from "../types";
import { greatCirclePoints, toLonLat } from "./coords";

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
