import { describe, expect, it } from "vitest";
import type { Topology } from "topojson-specification";
import world110 from "world-atlas/countries-110m.json";
import world50 from "world-atlas/countries-50m.json";
import { prepareCountries } from "./geodata";

const topo110 = world110 as unknown as Topology;
const topo50 = world50 as unknown as Topology;

describe("prepareCountries (world-atlas 110m)", () => {
  const world = prepareCountries(topo110);

  it("keeps every geometry", () => {
    expect(world.countries.length).toBeGreaterThan(170);
  });

  it("resolves ISO identity for every feature with a valid numeric id", () => {
    const unresolved = world.countries.filter(
      (c) => c.numeric && c.numeric !== "-99" && !c.alpha2,
    );
    expect(unresolved.map((c) => c.name)).toEqual([]);
  });

  it("looks up by alpha-2, alpha-3, numeric, canonical id and name", () => {
    const us = world.get("US");
    expect(us).toBeDefined();
    expect(us!.name).toBe("United States of America");
    expect(world.get("usa")).toBe(us);
    expect(world.get("840")).toBe(us);
    expect(world.get("us")).toBe(us);
    expect(world.get("United States of America")).toBe(us);
  });

  it("resolves Natural Earth display names to the same country", () => {
    expect(world.get("Dem. Rep. Congo")?.alpha2).toBe("CD");
    expect(world.get("CD")?.name).toBe("Democratic Republic of the Congo");
  });

  it("computes centroids and bounds", () => {
    const de = world.get("DE")!;
    expect(de.centroid[0]).toBeGreaterThan(5);
    expect(de.centroid[0]).toBeLessThan(16);
    expect(de.centroid[1]).toBeGreaterThan(46);
    expect(de.centroid[1]).toBeLessThan(56);
    const [[west, south], [east, north]] = de.bounds;
    expect(west).toBeLessThan(east);
    expect(south).toBeLessThan(north);
  });

  it("excludes countries by any code", () => {
    const withoutAntarctica = prepareCountries(topo110, { exclude: ["AQ"] });
    expect(withoutAntarctica.get("AQ")).toBeUndefined();
    expect(withoutAntarctica.countries.length).toBe(world.countries.length - 1);

    const byNumeric = prepareCountries(topo110, { exclude: ["010"] });
    expect(byNumeric.get("Antarctica")).toBeUndefined();
  });

  it("applies patchFeatures before identity resolution", () => {
    const patched = prepareCountries(topo110, {
      patchFeatures: (features) => features.filter((f) => String(f.id) !== "010"),
    });
    expect(patched.get("AQ")).toBeUndefined();
  });
});

describe("prepareCountries (world-atlas 50m)", () => {
  it("resolves every valid numeric id in the higher-resolution atlas too", () => {
    const world = prepareCountries(topo50);
    const unresolved = world.countries.filter(
      (c) => c.numeric && c.numeric !== "-99" && !c.alpha2,
    );
    expect(unresolved.map((c) => c.name)).toEqual([]);
  });
});

describe("prepareCountries (GeoJSON input)", () => {
  it("accepts a FeatureCollection and resolves via properties", () => {
    const world = prepareCountries({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "Germany" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [6, 47],
                [15, 47],
                [15, 55],
                [6, 55],
                [6, 47],
              ],
            ],
          },
        },
      ],
    });
    expect(world.get("DE")?.alpha3).toBe("DEU");
  });

  it("normalizes RFC 7946 counterclockwise winding so d3-geo reads the intended region", () => {
    // Exterior ring wound counterclockwise per the GeoJSON spec; d3-geo would
    // otherwise treat this as the whole sphere minus the box.
    const world = prepareCountries({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "Atlantis" }, // unresolvable → keeps its geometry as authored
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-30, 30],
                [-24, 30],
                [-24, 36],
                [-30, 36],
                [-30, 30],
              ],
            ],
          },
        },
      ],
    });
    const atlantis = world.countries[0]!;
    const [[west, south], [east, north]] = atlantis.bounds;
    expect(west).toBeCloseTo(-30, 1);
    expect(south).toBeCloseTo(30, 1);
    expect(east).toBeCloseTo(-24, 1);
    expect(north).toBeCloseTo(36, 1);
    // A non-inverted centroid sits inside the box, not at the antipode.
    expect(atlantis.centroid[0]).toBeGreaterThan(-30);
    expect(atlantis.centroid[0]).toBeLessThan(-24);
  });

  it("throws a helpful error for a missing topology object", () => {
    expect(() => prepareCountries(topo110, { object: "nope" })).toThrow(/no object "nope"/);
  });
});
