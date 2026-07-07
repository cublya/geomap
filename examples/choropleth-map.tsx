// -style: score choropleth with hover tooltip, selection and camera controls.
import * as React from "react";
import {
  GeoMap,
  prepareCountries,
  useMapCamera,
  type CountryHover,
} from "@cublya/geo";
import type { Topology } from "topojson-specification";
import world110 from "world-atlas/countries-110m.json";

const world = prepareCountries(world110 as unknown as Topology, { exclude: ["AQ"] });

// Your product owns scores and the color scale; the map only asks for a fill.
const BINS = ["#fde5d8", "#f6b99a", "#ea8a62", "#d55d39", "#b03a20"];
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
