// Regenerates the landing-page hero (docs/assets/hero-map.svg) with the
// library's own static renderer. Run `npm run build` first, then
// `node scripts/generate-hero-map.mjs`.
import { readFileSync, writeFileSync } from "node:fs";
import { renderStaticMapSvg, prepareCountries } from "../dist/index.js";

const world = JSON.parse(
  readFileSync(
    new URL("../node_modules/@cublya/world-atlas/countries-110m.json", import.meta.url),
    "utf8",
  ),
);
const countries = prepareCountries(world, { exclude: ["AQ"] });

// A multi-stop trip. Unlike e.g. New York → Tokyo, none of these legs
// cross the antimeridian, so the route reads as one continuous arc.
const frankfurt = { lat: 50.1109, lng: 8.6821 };
const baku = { lat: 40.4093, lng: 49.8671 };
const singapore = { lat: 1.3521, lng: 103.8198 };
const sydney = { lat: -33.8688, lng: 151.2093 };

// Landing-page palette (docs/styles.css tokens). The hero panel behind the
// SVG is sage, so gap borders in that tone read as clean cut-paper gaps.
const ink = "#17251f";
const paper = "#f7f4ec";
const sage = "#dfe8dc";
const accent = "#e86538";

let svg = renderStaticMapSvg({
  width: 1200,
  height: 600,
  countries: {
    data: countries,
    // Singapore has no polygon at 110m (Natural Earth drops microstates),
    // so it shows as a marker only.
    fill: (c) => (["DE", "AZ", "SG", "AU"].includes(c.alpha2) ? accent : ink),
    outline: { mode: "raised", color: sage, width: 0.7, elevation: 4 },
  },
  routes: [
    { id: "trip", stops: [frankfurt, baku, singapore, sydney], dashed: true, color: "#bd4020", width: 2.6, opacity: 1 },
  ],
  markers: [
    { id: "fra", coordinates: frankfurt, label: "Frankfurt", color: ink, size: 5 },
    { id: "bak", coordinates: baku, label: "Baku", color: ink, size: 5 },
    { id: "sin", coordinates: singapore, label: "Singapore", color: ink, size: 5 },
    { id: "syd", coordinates: sydney, label: "Sydney", color: ink, size: 5 },
  ],
  theme: { markerLabel: ink, halo: paper, landShadow: "rgba(23, 37, 31, 0.3)" },
});

// Presentation tweaks for hero scale: bigger labels, and a tighter viewBox
// that trims the band left empty by excluding Antarctica.
svg = svg
  .replaceAll('font-size="9"', 'font-size="15" font-weight="600"')
  .replace('viewBox="0 0 1200 600"', 'viewBox="35 8 1130 500"')
  .replace('width="1200" height="600"', 'width="1130" height="500"');

writeFileSync(new URL("../docs/assets/hero-map.svg", import.meta.url), svg);
console.log("wrote docs/assets/hero-map.svg,", svg.length, "bytes");
