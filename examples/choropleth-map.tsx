// -style: score choropleth with hover tooltip, selection and camera controls.
import * as React from "react";
import {
  GeoMap,
  prepareCountries,
  useMapCamera,
  type CountryHover,
} from "@cublya/geomap";
import type { Topology } from "topojson-specification";
import world110 from "@cublya/world-atlas/countries-110m.json";

const world = prepareCountries(world110 as unknown as Topology, { exclude: ["AQ"] });

// Your product owns scores and the color scale; the map only asks for a fill.
// OKLCH by default for perceptually-even steps, with a hex fallback for
// browsers that can't parse it (a bad color paints the shape black, not the hex).
const supportsOklch =
  typeof CSS !== "undefined" &&
  typeof CSS.supports === "function" &&
  CSS.supports("color", "oklch(0.5 0.1 200)");
const paint = (oklch: string, hex: string): string => (supportsOklch ? oklch : hex);

const BINS = [
  paint("oklch(0.956 0.015 182)", "#e6f4f1"),
  paint("oklch(0.866 0.049 182)", "#b0ded5"),
  paint("oklch(0.765 0.077 182)", "#79c3b6"),
  paint("oklch(0.632 0.088 187)", "#3f9b93"),
  paint("oklch(0.503 0.083 189)", "#12736e"),
];
declare function scoreOf(alpha2: string | null): number | null; // 0–100, from your data

function fillFor(alpha2: string | null): string | undefined {
  const score = scoreOf(alpha2);
  if (score == null) return undefined; // renders in the muted "no data" tone
  return BINS[Math.min(BINS.length - 1, Math.floor((score / 100) * BINS.length))];
}

export function ChoroplethMap() {
  const camera = useMapCamera({ center: [12, 34], zoom: 1.4 });
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [hover, setHover] = React.useState<CountryHover | null>(null);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      <GeoMap
        // The package defaults to preset="none" (nothing painted); opt into a
        // complete out-of-the-box look with one prop.
        preset="light"
        projection="mercator"
        // Move the antimeridian seam into the Bering Sea so Russia renders whole.
        projectionOptions={{ rotate: [-12, 0, 0] }}
        camera={camera}
        countries={{
          data: world,
          fill: (c) => fillFor(c.alpha2),
          selectedId,
          onSelect: (c) => {
            setSelectedId(c?.id ?? null);
            if (c) camera.fitTo(c); // fly to the clicked country
          },
          onHover: setHover,
        }}
        aria-label="Scores by country"
      />

      {hover && (
        <div
          style={{
            position: "fixed",
            left: hover.point[0],
            top: hover.point[1],
            transform: "translate(-50%, -130%)",
            pointerEvents: "none",
          }}
        >
          {hover.country.name}: {scoreOf(hover.country.alpha2) ?? "No data"}
        </div>
      )}

      <div style={{ position: "absolute", bottom: 16, right: 16, display: "grid", gap: 4 }}>
        <button aria-label="Zoom in" onClick={() => camera.zoomIn()}>+</button>
        <button aria-label="Zoom out" onClick={() => camera.zoomOut()}>−</button>
        <button aria-label="Reset view" onClick={() => camera.reset()}>⌂</button>
      </div>
    </div>
  );
}
