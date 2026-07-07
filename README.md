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
      preset="light"   // optional — omit for preset="none" (fully unstyled); no CSS import either way
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

See [Presets & theming](#presets--theming) below for the full story: four
built-in presets, `theme` overrides, CSS variables, and the class-name-only
`"none"` path.

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

## Presets & theming

**No CSS import is ever required.** By default the package paints nothing
extra — `<GeoMap />` with no `preset` renders exactly the layers you configure,
with no forced colors. That's `preset="none"`. When you *do* want a complete,
polished look with zero setup, pick a built-in preset — one prop, no CSS file:

```tsx
<GeoMap />                    // preset="none" — the default: unstyled, your call
<GeoMap preset="light" />     // complete light palette, ready to ship
<GeoMap preset="dark" />      // complete dark palette
<GeoMap preset="minimal" />   // hue-less line-art look
```

All presentation flows through SVG attributes and theme objects — no
Tailwind, no global CSS, no resets, no runtime CSS-in-JS, ever, in any mode.

Presets are generic, accessible (AA ink/surface contrast, visible focus
indicators) OKLCH neutral palettes with no raw `#fff`/`#000` and no product
semantics. They cover the ocean/background, default/hover/selected/disabled
countries, borders, markers, routes, live objects, focus rings, and the
optional controls/tooltip.

**Style precedence** (lowest → highest):

1. package defaults (`preset="none"` — nothing painted)
2. selected `preset` (`"light"` / `"dark"` / `"minimal"`, if you opt in)
3. `theme` token overrides
4. per-feature callbacks (`countries.fill` / `pattern` / `disabled`, `renderMarker`, …)
5. direct element props (`marker.color`, `route.color`, `countries.stroke`, …)

```tsx
// 3 — partial tokens over any preset:
<GeoMap preset="dark" theme={{ route: "oklch(0.8 0.1 150)" }} />

// exported preset objects compose:
import { presets } from "@cublya/geo";
<GeoMap theme={{ ...presets.dark, marker: "var(--brand)" }} />
```

Every preset value is `var(--geo-*, fallback)`, so any ancestor can
retheme every map inside it with plain CSS variables — no props needed:

```css
:root { --geo-land: oklch(0.9 0.02 150); --geo-route: var(--brand); }
```

With `preset="none"` no presentation attributes are emitted; start from scratch
against the semantic class names — `geo-country` (plus `[data-country]`,
`[data-selected]`, `[data-disabled]`), `geo-route`, `geo-marker`,
`geo-label`, `geo-live`, `geo-trail`,
`geo-graticule`, `geo-sphere`, `geo-hover`.

Non-color state encoding (colour-blind-safe, à la ) via
`countries.pattern: (c) => "hatch" | "dots" | undefined`; inert countries via
`countries.disabled: (c) => boolean`.

### Optional controls, tooltip and stylesheet

`GeoControls` (zoom in/out/reset for either camera) and `GeoTooltip`
(pointer-anchored hover tooltip) take the same `preset`/`theme` props, also
defaulting to `preset="none"` (bare buttons/div for your own CSS). Pass the
same preset as your map — e.g. `<GeoControls camera={camera} preset="light" />`
— for a matching, complete look with no CSS file. The optional stylesheet only
adds what inline styles can't express — hover/active/focus-visible states and
a tooltip shadow — and styles nothing but these HTML helpers (all selectors
namespaced under `.geo-*`, so it cannot leak):

```tsx
import { GeoControls, GeoTooltip } from "@cublya/geo";
import "@cublya/geo/styles.css";   // optional pseudo-class polish
```

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

## Storybook

The documentation and demo site — every feature above as a live story, including
the theming modes, keyboard/reduced-motion behaviour and a performance stress
case — deploys from `main` to **https://cublya.github.io/geo/**. Run it locally
with `npm run storybook`.

## Development

```sh
npm install
npm run test               # vitest unit tests (jsdom)
npm run lint               # eslint (src, examples, stories)
npm run typecheck          # tsc --noEmit
npm run build              # tsup → dist/ (ESM + d.ts + styles.css)
npm run verify             # lint + types + tests + build + publint + pack dry-run
npm run storybook          # dev server on :6006
npm run build-storybook    # static site → storybook-static/
npm run test-storybook:ci  # interaction + axe accessibility tests (built SB)
npm run test:e2e           # Playwright screenshot tests (build Storybook first)
bash scripts/verify-fixtures.sh   # install packed tarball into Vite + Next.js apps
node scripts/generate-iso.mjs     # regenerate the ISO table
```

Examples live in [`examples/`](examples); migration guides for the four Cublya apps
in [`docs/migrations/`](docs/migrations).

## License

[MIT](LICENSE)
