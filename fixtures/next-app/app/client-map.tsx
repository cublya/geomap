"use client";

// Client Component boundary: interactive maps need the browser. The package
// ships no "use client" directive by design (its core is server-safe), so the
// boundary lives here in the app.
import * as React from "react";
import { GeoControls, GeoMap, prepareCountries, useMapCamera } from "@cublya/geo";
import world110 from "world-atlas/countries-110m.json";

const world = prepareCountries(
  world110 as unknown as Parameters<typeof prepareCountries>[0],
  { exclude: ["AQ"] },
);

export function ClientMap() {
  const camera = useMapCamera();
  const [selected, setSelected] = React.useState<string | null>(null);
  return (
    <div style={{ position: "relative", height: "100%" }}>
      <GeoMap
        camera={camera}
        countries={{
          data: world,
          fill: (c) => (c.id === selected ? "#7f61d3" : undefined),
          selectedId: selected,
          onSelect: (c) => setSelected(c?.id ?? null),
        }}
        aria-label="Interactive fixture map"
      />
      <GeoControls camera={camera} style={{ position: "absolute", bottom: 12, right: 12 }} />
    </div>
  );
}
