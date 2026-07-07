// -style: spend choropleth + journey pins + multi-stop arcs, auto-framed.
// Wheel zoom is disabled so the surrounding page keeps scrolling (zoom buttons only).
import * as React from "react";
import { GeoMap, prepareCountries, useMapCamera, type Coordinate } from "@cublya/geomap";
import type { Topology } from "topojson-specification";
import world110 from "world-atlas/countries-110m.json";

const world = prepareCountries(world110 as unknown as Topology, { exclude: ["AQ"] });

interface Stop {
  id: string;
  label: string;
  coordinates: Coordinate;
}

export function MomentsJourney({
  stops,
  spendByAlpha2, // e.g. Map { "DE" => 1240, "JP" => 890 }
  maxSpend,
  onSelect,
}: {
  stops: Stop[];
  spendByAlpha2: ReadonlyMap<string, number>;
  maxSpend: number;
  onSelect: (stopId: string) => void;
}) {
  const camera = useMapCamera({ maxZoom: 6 });
  const coordinates = stops.map((s) => s.coordinates);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      <GeoMap
        preset="light"
        camera={camera}
        wheelZoom={false}
        fit={coordinates.length > 0 ? coordinates : "world"}
        countries={{
          data: world,
          fill: (c) => {
            const spend = c.alpha2 ? spendByAlpha2.get(c.alpha2) : undefined;
            if (!spend || maxSpend <= 0) return undefined;
            // sqrt ramp keeps small trips visible ('s scale).
            const t = Math.sqrt(spend / maxSpend);
            return `color-mix(in oklch, var(--brand-200), var(--brand-800) ${Math.round(t * 100)}%)`;
          },
        }}
        // One connected journey line through every stop.
        routes={
          stops.length >= 2
            ? [{ id: "journey", stops: coordinates, dashed: true, opacity: 0.7 }]
            : []
        }
        markers={stops.map((s) => ({
          id: s.id,
          coordinates: s.coordinates,
          label: s.label,
          size: 3.5,
          color: "var(--brand)",
        }))}
        onMarkerClick={(m) => onSelect(m.id)}
        aria-label="Journey map"
      />
      <div style={{ position: "absolute", bottom: 16, right: 16, display: "grid", gap: 4 }}>
        <button aria-label="Zoom in" onClick={() => camera.zoomIn()}>+</button>
        <button aria-label="Zoom out" onClick={() => camera.zoomOut()}>−</button>
      </div>
    </div>
  );
}
