// Reproduces the seam list in docs/guides/choosing-a-projection.md: countries
// drawn in pieces at opposite edges for a given projection rotation.
// Usage: node scripts/measure/antimeridian-seam.mjs [path/to/countries-50m.json]
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";

const require = createRequire(import.meta.url);
const file = process.argv[2] ?? require.resolve("@cublya/world-atlas/countries-50m.json");
const topology = JSON.parse(readFileSync(file, "utf8"));
const countries = feature(topology, topology.objects.countries).features;

// A country whose projected bounds span more than half the map width is split
// across the seam (no single country is that wide on its own).
for (const lambda of [0, -10, -12, -150]) {
  const path = geoPath(geoNaturalEarth1().rotate([lambda, 0, 0]).fitSize([960, 500], { type: "Sphere" }));
  const split = countries
    .filter((f) => {
      const [[x0], [x1]] = path.bounds(f);
      return x1 - x0 > 480;
    })
    .map((f) => f.properties.name);
  console.log(`rotate [${lambda}, 0, 0]: ${split.join(", ")}`);
}
