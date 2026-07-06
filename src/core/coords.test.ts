import { describe, expect, it } from "vitest";
import {
  angularDistance,
  bearingBetween,
  geographicBounds,
  greatCirclePoints,
  haversineKm,
  interpolateGreatCircle,
  shortestAngleDelta,
  sphericalCentroid,
  toLonLat,
} from "./coords";

const LHR = { lat: 51.47, lng: -0.4543 };
const JFK = { lat: 40.6413, lng: -73.7781 };

describe("toLonLat", () => {
  it("accepts tuples, {lat,lng} and {lat,lon}", () => {
    expect(toLonLat([10, 20])).toEqual([10, 20]);
    expect(toLonLat({ lat: 20, lng: 10 })).toEqual([10, 20]);
    expect(toLonLat({ lat: 20, lon: 10 })).toEqual([10, 20]);
  });
});

describe("haversineKm", () => {
  it("computes the LHR→JFK distance (~5540 km)", () => {
    expect(haversineKm(LHR, JFK)).toBeGreaterThan(5500);
    expect(haversineKm(LHR, JFK)).toBeLessThan(5600);
  });

  it("is zero for identical points and symmetric", () => {
    expect(haversineKm(LHR, LHR)).toBe(0);
    expect(haversineKm(LHR, JFK)).toBeCloseTo(haversineKm(JFK, LHR), 9);
  });
});

describe("bearingBetween", () => {
  it("points north along a meridian", () => {
    expect(bearingBetween([0, 0], [0, 10])).toBeCloseTo(0, 6);
  });

  it("points east along the equator", () => {
    expect(bearingBetween([0, 0], [10, 0])).toBeCloseTo(90, 6);
  });

  it("points south and west", () => {
    expect(bearingBetween([0, 10], [0, 0])).toBeCloseTo(180, 6);
    expect(bearingBetween([10, 0], [0, 0])).toBeCloseTo(270, 6);
  });
});

describe("interpolateGreatCircle", () => {
  it("returns the endpoints at t=0 and t=1", () => {
    const start = interpolateGreatCircle(LHR, JFK, 0);
    const end = interpolateGreatCircle(LHR, JFK, 1);
    expect(start[0]).toBeCloseTo(-0.4543, 4);
    expect(start[1]).toBeCloseTo(51.47, 4);
    expect(end[0]).toBeCloseTo(-73.7781, 4);
    expect(end[1]).toBeCloseTo(40.6413, 4);
  });

  it("finds a midpoint equidistant from both endpoints", () => {
    const mid = interpolateGreatCircle(LHR, JFK, 0.5);
    expect(haversineKm(LHR, mid)).toBeCloseTo(haversineKm(mid, JFK), 6);
  });

  it("arcs poleward of the rhumb line for east-west routes", () => {
    const mid = interpolateGreatCircle(LHR, JFK, 0.5);
    expect(mid[1]).toBeGreaterThan(51.47);
  });

  it("handles coincident points without NaN", () => {
    expect(interpolateGreatCircle([5, 5], [5, 5], 0.5)).toEqual([5, 5]);
  });
});

describe("greatCirclePoints", () => {
  it("returns n+1 points including both endpoints", () => {
    const points = greatCirclePoints(LHR, JFK, 32);
    expect(points).toHaveLength(33);
    expect(points[0]![1]).toBeCloseTo(51.47, 4);
    expect(points[32]![1]).toBeCloseTo(40.6413, 4);
  });
});

describe("geographicBounds", () => {
  it("computes the bbox of a coordinate set", () => {
    expect(geographicBounds([[0, 0], [10, -5], [-3, 8]])).toEqual([
      [-3, -5],
      [10, 8],
    ]);
  });
});

describe("sphericalCentroid", () => {
  it("is the midpoint of two equatorial points", () => {
    const c = sphericalCentroid([[0, 0], [90, 0]]);
    expect(c[0]).toBeCloseTo(45, 6);
    expect(c[1]).toBeCloseTo(0, 6);
  });
});

describe("shortestAngleDelta", () => {
  it("takes the short way around", () => {
    expect(shortestAngleDelta(350, 10)).toBe(20);
    expect(shortestAngleDelta(10, 350)).toBe(-20);
    expect(shortestAngleDelta(0, 180)).toBe(180);
  });
});

describe("angularDistance", () => {
  it("returns radians (quarter circle = π/2)", () => {
    expect(angularDistance([0, 0], [90, 0])).toBeCloseTo(Math.PI / 2, 3);
  });
});
