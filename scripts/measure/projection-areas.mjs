// Reproduces the area table in docs/guides/choosing-a-projection.md.
// Usage: node scripts/measure/projection-areas.mjs [path/to/countries-50m.json]
// Defaults to the installed @cublya/world-atlas; the guide's figures were
// measured on 3.0.0-beta.2.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { geoArea, geoEqualEarth, geoMercator, geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";

const require = createRequire(import.meta.url);
const file = process.argv[2] ?? require.resolve("@cublya/world-atlas/countries-50m.json");
const topology = JSON.parse(readFileSync(file, "utf8"));
const countries = feature(topology, topology.objects.countries).features;
const byName = (name) => countries.find((f) => f.properties.name === name);

// Natural Earth and Equal Earth are fitted to the sphere. Mercator cannot be
// (its sphere is unbounded), so it gets a scale that maps 360° of longitude to
// the same width. Ratios between countries do not depend on scale either way.
const projections = {
  mercator: geoMercator().scale(960 / (2 * Math.PI)).translate([480, 250]),
  naturalEarth1: geoNaturalEarth1().fitSize([960, 500], { type: "Sphere" }),
  equalEarth: geoEqualEarth().fitSize([960, 500], { type: "Sphere" }),
};

const reference = byName("Dem. Rep. Congo");
const names = ["Greenland", "Russia", "Canada", "Norway", "Brazil", "Nigeria"];
const rows = names.map((name) => {
  const country = byName(name);
  const row = { country: name, true: (geoArea(country) / geoArea(reference)).toFixed(2) };
  for (const [key, projection] of Object.entries(projections)) {
    const path = geoPath(projection);
    row[key] = (path.area(country) / path.area(reference)).toFixed(2);
  }
  return row;
});
console.table(rows);
