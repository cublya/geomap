// -style: visited/wishlist state on a drag-rotatable globe with inertia,
// with hatch/dot patterns so state never relies on colour alone.
import * as React from "react";
import { GeoGlobe, prepareCountries, useGlobeCamera } from "@cublya/geo";
import type { Topology } from "topojson-specification";
import world110 from "world-atlas/countries-110m.json";

const world = prepareCountries(world110 as unknown as Topology);

export function PassportGlobe({
  visitedIds,
  wishlistIds,
}: {
  visitedIds: ReadonlySet<string>; // lowercase alpha-2 ids, e.g. "jp"
  wishlistIds: ReadonlySet<string>;
}) {
  const camera = useGlobeCamera({ rotation: [-10, -18, 0] });
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  return (
    <GeoGlobe
      camera={camera}
      inertia
      // Start from the light preset (complete: ocean, borders, graticule, …),
      // then override just the tokens that should follow the app's brand.
      preset="light"
      theme={{
        land: "var(--muted)",
        selectedStroke: "var(--brand-strong)",
        patternInk: "var(--primary-foreground)",
      }}
      countries={{
        data: world,
        fill: (c) =>
          visitedIds.has(c.id)
            ? "var(--brand)"
            : wishlistIds.has(c.id)
              ? "var(--warn)"
              : undefined,
        pattern: (c) =>
          visitedIds.has(c.id) ? "hatch" : wishlistIds.has(c.id) ? "dots" : undefined,
        selectedId,
        onSelect: (c) => {
          setSelectedId(c?.id ?? null);
          if (c) camera.focus(c.centroid, { zoom: 1.8 }); // rotate country to camera
        },
      }}
      aria-label="Countries you have visited"
    />
  );
}
