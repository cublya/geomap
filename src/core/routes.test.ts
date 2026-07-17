import { describe, expect, it } from "vitest";
import { routeGeometryLineString, routeLineString, routePoints } from "./routes";

describe("routePoints", () => {
  it("chains multi-stop routes without duplicating shared stops", () => {
    const stops: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
    ];
    const points = routePoints(stops, 8);
    expect(points).toHaveLength(2 * 8 + 1);
    expect(points[0]).toEqual([0, 0]);
    expect(points[8]![0]).toBeCloseTo(10, 6);
    expect(points[8]![1]).toBeCloseTo(0, 6);
    expect(points[16]![0]).toBeCloseTo(10, 6);
    expect(points[16]![1]).toBeCloseTo(10, 6);
  });

  it("handles degenerate inputs", () => {
    expect(routePoints([])).toEqual([]);
    expect(routePoints([[5, 5]])).toEqual([[5, 5]]);
  });

  it("accepts {lat,lng} stops", () => {
    const points = routePoints([{ lat: 0, lng: 0 }, { lat: 0, lng: 10 }], 4);
    expect(points).toHaveLength(5);
  });
});

describe("routeLineString", () => {
  it("produces a GeoJSON LineString", () => {
    const line = routeLineString([
      [0, 0],
      [10, 10],
    ]);
    expect(line.type).toBe("LineString");
    expect(line.coordinates.length).toBe(49);
  });
});

describe("routeGeometryLineString", () => {
  it("keeps straight routes at exactly their supplied stops while great circles densify", () => {
    const stops: [number, number][] = [
      [0, 0],
      [10, 10],
      [20, 5],
    ];
    expect(routeGeometryLineString({ stops, geometry: "straight" }).coordinates).toEqual(stops);
    expect(routeGeometryLineString({ stops, geometry: "great-circle" }).coordinates).toHaveLength(97);
  });
});
