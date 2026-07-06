# @cublya/geo

Composable React map primitives on [d3-geo](https://github.com/d3/d3-geo): country
choropleths with real ISO identity, rotatable orthographic globes, markers,
great-circle routes, animated live objects, and a camera with fit / focus / fly-to —
all SVG, all tree-shakeable, no basemap or product data bundled.

Built to subsume the hand-rolled maps in Cublya's , ,  and 
apps (see [docs/feature-matrix.md](docs/feature-matrix.md) and the
[migration guides](docs/migrations)).

## Install

```sh
npm install @cublya/geo
# recommended basemap (the package deliberately ships none):
npm install world-atlas
```

React ≥ 18 and `react-dom` are peer dependencies. The package is ESM-only with
`sideEffects: false` — unused layers and helpers tree-shake away.

## Quickstart

```tsx
import { GeoMap, prepareCountries } from "@cublya/geo";
import world from "world-atlas/countries-110m.json";

const countries = prepareCountries(world, { exclude: ["AQ"] });

export function SpendMap() {
  return (
    <GeoMap
      countries={{
        data: countries,
        fill: (c) => spendColor(c.alpha2),     // undefined → muted "no data" tone
        selectedId: selected,
        onSelect: (c) => setSelected(c?.id ?? null),  // null = ocean click
        onHover: (h) => setTooltip(h && { name: h.country.name, at: h.point }),
      }}
      fit="world"
      aria-label="Spend by country"
    />
  );
}
```

Swap `GeoMap` for `GeoGlobe` and the same props render a drag-rotatable
orthographic globe with inertia:

```tsx
<GeoGlobe countries={{ data: countries, fill }} markers={pins} routes={arcs} autoRotate={4} />
```

## Country data and ISO identity

`prepareCountries(topologyOrGeoJSON, options)` converts TopoJSON (world-atlas
convention) or a GeoJSON FeatureCollection and resolves every feature against a
bundled ISO 3166-1 table plus a Natural-Earth name reconciliation map:

```ts
const world = prepareCountries(topology, {
  object: "countries",      // TopoJSON object name (default)
  exclude: ["AQ"],          // drop by any code or name
  patchFeatures: (fs) => fs // editorial geometry fixes stay in your app
});

world.get("US") === world.get("usa") === world.get("840")
  === world.get("United States of America");

const { id, alpha2, alpha3, numeric, name, centroid, bounds, feature } = world.get("jp")!;
```

Identity helpers are exported standalone: `lookupIso("DEU")`,
`resolveCountryName("Dem. Rep. Congo")`, `ISO_3166_1`.

## Cameras

```tsx
import { GeoMap, useMapCamera } from "@cublya/geo";

const camera = useMapCamera({ maxZoom: 8 });

camera.zoomIn();  camera.zoomOut();  camera.reset();
camera.flyTo({ center: [12, 34], zoom: 3 });          // 600 ms eased tween
camera.fitTo(world.get("BR")!);                        // country / coords / bounds / "world"

<GeoMap camera={camera} … />
```

`useGlobeCamera()` is the globe twin, with `focus(coordinate)` (rotate a point to
face the camera, taking the short way around) and a spherical-cap `fitTo(coords)`.
`useMapView(camera)` / `useGlobeView(camera)` give reactive reads. Both cameras are
plain framework-free stores (`createMapCamera()` / `createGlobeCamera()`) if you
need them outside React. The declarative `fit` prop refits whenever its value
changes — handy for "frame the selection" flows.

All tweens and inertia honour `prefers-reduced-motion` by jumping to the target.

## Markers, routes, live objects

```tsx
<GeoMap
  markers={[{ id: "vie", coordinates: { lat: 48.2, lng: 16.37 }, label: "VIE", kind: "airport" }]}
  onMarkerClick={(m) => open(m.id)}
  renderMarker={(m, { counterScale }) => <MyPin scale={counterScale} />}   // optional
  routes={[{ id: "trip", stops: [vienna, tokyo, sydney], dashed: true }]}  // ≥2 stops chained
  live={{
    objects: flights.map((f) => ({
      id: f.id,
      coordinates: f.position,        // update as often as your feed ticks
      heading: f.heading,             // degrees, 0 = north, clockwise
      trail: f.track,
      label: f.number,
    })),
    transitionMs: 1000,               // slerp between updates on one shared rAF loop
  }}
/>
```

Marker sizes counter-scale under zoom so pins stay screen-constant; on the globe,
markers/objects on the far hemisphere are culled automatically.

## Custom SVG layers

Children render in projected space with full context access:

```tsx
function Halo({ at }: { at: Coordinate }) {
  const { project, path, counterScale } = useGeo();
  const p = project(at);
  return p && <circle cx={p[0]} cy={p[1]} r={12 * counterScale} className="animate-ping" />;
}

<GeoMap countries={{ data: world }}><Halo at={paris} /></GeoMap>
```

## Theming

A flat object of CSS color strings — design-token variables work as-is:

```tsx
<GeoMap theme={{ land: "var(--muted)", route: "var(--brand)" }} />   // over defaultTheme
<GeoMap theme={darkTheme} />                                          // bundled dark palette
```

Non-color state encoding (colour-blind-safe, à la ) via
`countries.pattern: (c) => "hatch" | "dots" | undefined`.

## Interaction & accessibility

Pointer events unify mouse/touch/pen: drag pans or rotates (deferred capture keeps
taps clickable), wheel zooms at the cursor (`wheelZoom={false}` to preserve page
scroll), two-pointer pinch zooms. When focused: arrows pan/rotate, `+`/`-` zoom,
`Home`/`0` reset. The SVG is `role="img"` with an `aria-label`, focusable, and every
country carries a native `<title>`.

## Static share images

```ts
import { renderStaticMapSvg, svgToPngBlob } from "@cublya/geo";

const svg = renderStaticMapSvg({
  width: 1080, height: 1080,
  background: "#0d0f10",
  countries: { data: world, fill: (c) => (visited.has(c.id) ? "#e07a5f" : undefined) },
  routes: [{ id: "trip", stops }],
  theme: { land: "#22262a", landMuted: "#1a1d20" },   // concrete colors for export
});
const blob = await svgToPngBlob(svg, { width: 1080, height: 1080, scale: 2 });
```

Same geometry pipeline as `<GeoMap>`, so exports match the on-screen map.

## Lower-level utilities

`greatCirclePoints`, `interpolateGreatCircle`, `bearingBetween`, `haversineKm`,
`sphericalCentroid`, `geographicBounds`, `routeLineString`, `createFlatProjection`,
`createGlobeProjection`, `tween`, `startDecay`, `prefersReducedMotion` — everything
the components are built from is exported for advanced composition. Full surface:
[docs/api-design.md](docs/api-design.md).

## What this package is not

No product data, no fetching, no tooltip/legend UI (you get hover data and scale
helpers; popovers are yours), no bundled basemap, no border politics
(`patchFeatures` is the hook for editorial geometry). A Canvas renderer is a
planned escape hatch — the core emits only data, so the API won't change.

## Development

```sh
npm install
npm run test        # vitest (jsdom)
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm run build       # tsup → dist/ (ESM + d.ts)
npm run verify      # all of the above + npm pack --dry-run
node scripts/generate-iso.mjs   # regenerate the ISO table
```

Examples live in [`examples/`](examples); migration guides for the four Cublya apps
in [`docs/migrations/`](docs/migrations).

## License

[MIT](LICENSE)
