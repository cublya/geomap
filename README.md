<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/public/brand/logo-white.svg">
    <img src="docs/public/brand/logo-black.svg" alt="Cublya" width="140">
  </picture>
</p>

# @cublya/geomap

Composable React map primitives on [d3-geo](https://github.com/d3/d3-geo): country
choropleths with real ISO identity, rotatable orthographic globes, markers,
great-circle routes, animated live objects, and a camera with fit / focus / fly-to
(all SVG, all tree-shakeable, no basemap or product data bundled).

Built to subsume the hand-rolled maps in several Cublya apps.

## Install

```sh
npm install @cublya/geomap
# recommended basemap (the package deliberately ships none):
npm install @cublya/world-atlas
```

React ≥ 18 and `react-dom` are peer dependencies. The package is ESM-only with
`sideEffects: false`; unused layers and helpers tree-shake away.

`@cublya/world-atlas` ships three resolutions. The default `countries-*.json`
files use its UN-style boundary view: Crimea resolves to Ukraine, Kosovo to
Serbia, Northern Cyprus to Cyprus, and Somaliland to Somalia. The 10m and 50m
files cover all 193 UN member states and both non-member observer states; the
110m file drops 28 members and the Holy See; see
[docs/basemap-coverage.md](docs/basemap-coverage.md) for the full breakdown and
how to re-verify after a `@cublya/world-atlas` upgrade.

## Quickstart

```tsx
import { GeoMap, prepareCountries } from "@cublya/geomap";
import world from "@cublya/world-atlas/countries-10m.json";

const countries = prepareCountries(world, { exclude: ["AQ"] });

export function SpendMap() {
  return (
    <GeoMap
      preset="light"   // optional: omit for preset="none" (fully unstyled); no CSS import either way
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

See [Presets & theming](#presets--theming) below for the full story: the
`preset` × `palette` × `outline` axes, `theme` overrides, CSS variables, and the
class-name-only `"none"` path.

Swap `GeoMap` for `GeoGlobe` and the same props render a drag-rotatable
orthographic globe with inertia:

```tsx
<GeoGlobe countries={{ data: countries, fill }} markers={pins} routes={arcs} autoRotate={4} />
```

Or hand the choice to the user: `GeoView` is one component that flips between the
two surfaces via a built-in segmented toggle (a `GeoViewToggle`: map | globe,
top-left) plus the zoom cluster (bottom-right). The same shared props apply, and
the geographic centre (plus range-scaled zoom) carries across the switch, so
flipping stays put instead of snapping home:

```tsx
import { GeoView } from "@cublya/geomap";

// Uncontrolled: a map with a map⇄globe toggle top-left:
<GeoView preset="light" defaultMode="map" countries={{ data: countries, fill }} markers={pins} />

// Or controlled from your own state:
<GeoView preset="light" mode={mode} onModeChange={setMode} countries={{ data: countries, fill }} />
```

Use `<GeoViewToggle mode onModeChange />` standalone to drive your own swap, and
`toggle={false}` / `controls={false}` on `GeoView` to drop either overlay.

## Country data and ISO identity

`prepareCountries(topologyOrGeoJSON, options)` converts TopoJSON (`@cublya/world-atlas`
convention; see [docs/basemap-coverage.md](docs/basemap-coverage.md) for which
resolution has full UN-member coverage) or a GeoJSON FeatureCollection and
resolves every feature against a bundled ISO 3166-1 table plus a Natural-Earth
name reconciliation map:

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
import { GeoMap, useMapCamera } from "@cublya/geomap";

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
changes, handy for "frame the selection" flows.

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
extra; `<GeoMap />` with no `preset` renders exactly the layers you configure,
with no forced colors. That's `preset="none"`. When you *do* want a complete,
polished look with zero setup, pick a built-in preset, one prop, no CSS file:

Theming is three orthogonal axes: **`preset`** picks the colour mode,
**`palette`** picks the fill palette, and **`countries.outline`** picks
the border behaviour, independently, so you don't need a preset per combination.

```tsx
<GeoMap />                                        // preset="none", the default: unstyled, your call
<GeoMap preset="light" />                         // complete light palette, ready to ship
<GeoMap preset="dark" />                          // complete dark palette
<GeoMap preset="light" palette="minimal" /> // hue-less line-art palette
<GeoMap preset="light" countries={{ data, outline: "gap" }} />    // cut-paper: borders in the ocean tone
<GeoMap preset="light" countries={{ data, outline: "raised" }} /> // raised land with a soft shadow
```

`palette`: the **fill palette** (defaults to `"default"`):

| variant     | look                                                |
| ----------- | --------------------------------------------------- |
| `"default"` | plain filled land                                   |
| `"minimal"` | hue-less line-art: transparent ocean, faint fills  |

`countries.outline`: the **border behaviour** (a mode, an `{ mode, color, width, dash, elevation }`
style, or a `(country) => …` callback for per-feature borders; defaults to `"line"`):

| outline    | look                                                                    |
| ---------- | ----------------------------------------------------------------------- |
| `"line"`   | contrast hairline (the classic ink-on-paper divider)                    |
| `"gap"`    | borders painted in the ocean tone so countries read as clean gaps       |
| `"raised"` | `gap` plus a soft drop shadow lifting the land off the ocean            |
| `"none"`   | no border                                                               |

The old bundled presets are palette × outline: `crisp` = `default` + `outline="gap"`,
`chalk` = `minimal` + `outline="gap"`, `relief` = `default` + `outline="raised"`.

All presentation flows through SVG attributes and theme objects: no
Tailwind, no global CSS, no resets, no runtime CSS-in-JS, ever, in any mode.

Presets are generic, accessible (AA ink/surface contrast, visible focus
indicators) OKLCH neutral palettes with no raw `#fff`/`#000` and no product
semantics. They cover the ocean/background, default/hover/selected/disabled
countries, borders, markers, routes, live objects, focus rings, and the
optional controls/tooltip.

**Style precedence** (lowest → highest):

1. package defaults (`preset="none"`, nothing painted)
2. selected `preset` + `palette` (`"light"`/`"dark"` × `"default"`/`"minimal"`, if you opt in)
3. `theme` token overrides
4. per-feature callbacks (`countries.fill` / `pattern` / `disabled` / `outline`, `renderMarker`, …)
5. direct element props (`marker.color`, `route.color`, `countries.outline`, …)

```tsx
// 3, partial tokens over any preset:
<GeoMap preset="dark" theme={{ route: "oklch(0.8 0.1 150)" }} />

// exported preset objects compose; index by mode then palette:
import { presets } from "@cublya/geomap";
<GeoMap theme={{ ...presets.dark.minimal, marker: "var(--brand)" }} />
```

Every preset value is `var(--geomap-*, fallback)`, so any ancestor can
retheme every map inside it with plain CSS variables, no props needed:

```css
:root { --geomap-land: oklch(0.9 0.02 150); --geomap-route: var(--brand); }
```

With `preset="none"` no presentation attributes are emitted; start from scratch
against the semantic class names: `geomap-country` (plus `[data-country]`,
`[data-selected]`, `[data-disabled]`), `geomap-route`, `geomap-marker`,
`geomap-label`, `geomap-live`, `geomap-trail`,
`geomap-graticule`, `geomap-sphere`, `geomap-hover`.

Non-color state encoding (colour-blind-safe) via
`countries.pattern: (c) => "hatch" | "dots" | undefined`; inert countries via
`countries.disabled: (c) => boolean`.

### Optional controls, tooltip and stylesheet

`GeoControls` (zoom in/out/reset for either camera, rendered as a segmented
pill with SVG icons) and `GeoTooltip` (pointer-anchored hover tooltip) take the
same `preset`/`theme` props, also defaulting to `preset="none"`. Pass the same
preset as your map (e.g. `<GeoControls camera={camera} preset="light" />`) for
a matching, complete look (shadow and icons included) with no CSS file. The
optional stylesheet only adds what inline styles can't express (hover/active/
focus-visible states) and styles nothing but these HTML helpers (all selectors
namespaced under `.geomap-*`, so it cannot leak):

```tsx
import { GeoControls, GeoTooltip } from "@cublya/geomap";
import "@cublya/geomap/styles.css";   // optional pseudo-class polish
```

**Bring your own styles (Tailwind or raw CSS).** Every part has a stable class
and a `data-geomap-part` hook, and `preset="none"` emits **zero** inline styles,
so your classes never fight an inline `style`. Use the `classNames` slots to
attach utility classes per part:

```tsx
// Tailwind: own every part
<GeoControls
  camera={camera}
  classNames={{
    root: "gap-1 rounded-xl bg-white/90 shadow-lg backdrop-blur",
    button: "size-9 text-slate-700 hover:bg-slate-100",
    reset: "text-rose-500",
  }}
/>

// Raw CSS: headless; target the semantic hooks
<GeoControls camera={camera} orientation="horizontal" />
```
```css
.geomap-controls { border-radius: 12px; overflow: hidden; }
.geomap-controls__button { width: 36px; height: 36px; }
[data-geomap-part="reset"] { color: crimson; }
```

`GeoTooltip` exposes the same `className` / `data-geomap-part="tooltip"` hooks.
`GeoControls` (and the segmented `GeoViewToggle`) also take an `icons` slot to
replace any built-in glyph with your own node; the package ships **no** icon
dependency, so you bring the nodes:

```tsx
import { Plus, Minus, Map, Globe } from "lucide-react";

<GeoControls camera={camera} icons={{ zoomIn: <Plus size={15} />, zoomOut: <Minus size={15} /> }} />
<GeoViewToggle mode={mode} onModeChange={setMode} icons={{ map: <Map size={15} />, globe: <Globe size={15} /> }} />
```

## Interaction & accessibility

Pointer events unify mouse/touch/pen: drag pans or rotates (deferred capture keeps
taps clickable), wheel zooms at the cursor (`wheelZoom={false}` to preserve page
scroll), two-pointer pinch zooms. When focused: arrows pan/rotate, `+`/`-` zoom,
`Home`/`0` reset. The SVG is `role="img"` with an `aria-label`, focusable, and every
country carries a native `<title>`.

## Static share images

```ts
import { renderStaticMapSvg, svgToPngBlob } from "@cublya/geomap";

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
`createGlobeProjection`, `tween`, `startDecay`, `prefersReducedMotion`: everything
the components are built from is exported for advanced composition. Full surface:
[docs/api-design.md](docs/api-design.md).

## What this package is not

No product data, no fetching, no tooltip/legend UI (you get hover data and scale
helpers; popovers are yours), no bundled basemap, no border politics
(`patchFeatures` is the hook for editorial geometry). A Canvas renderer is a
planned escape hatch; the core emits only data, so the API won't change.

## Storybook

The hosted project site deploys from `main` to **https://cublya.github.io/geomap/**.
The landing page is at the site root, Storybook lives under
[`/geomap/storybook/`](https://cublya.github.io/geomap/storybook/), and the
long-form documentation under
[`/geomap/docs/`](https://cublya.github.io/geomap/docs/). Run Storybook locally
with `npm run storybook` or the documentation site with `npm run docs:dev`.

## Documentation

Storybook is the interactive catalogue, not the complete project documentation.
The [documentation index](docs/README.md) links the getting-started guide, public
API reference, architecture, data and rendering concepts, theming and
accessibility, testing and releases, troubleshooting, and basemap coverage
notes.

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
npm run docs:dev           # long-form documentation dev server
npm run build-site         # Storybook + docs → storybook-static/ (used by CI tests)
npm run build-pages        # landing page + Storybook + docs → site/ (Pages artifact)
npm run test-storybook:ci  # interaction + axe accessibility tests (built SB)
npm run test:e2e           # Playwright screenshot tests (build Storybook first)
bash scripts/verify-fixtures.sh   # install packed tarball into Vite + Next.js apps
node scripts/generate-iso.mjs     # regenerate the ISO table
```

Examples live in [`examples/`](examples).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, the pre-PR check list, and
conventions.

## License

[MIT](LICENSE)
