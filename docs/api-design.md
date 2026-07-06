# API design

`@cublya/geo` is a React + TypeScript + d3-geo library of map primitives. It owns
geometry, projection, camera and interaction; it never owns product data, business
rules, basemap files or copy. Everything is exported from the package root, ESM-only,
`sideEffects: false`, so unused layers tree-shake away.

## Layering

```
┌──────────────────────────────────────────────────────────┐
│ React components   <GeoMap/> <GeoGlobe/>                 │  high level
│ React hooks        useMapCamera useGlobeCamera useGeo    │
│                    usePrefersReducedMotion               │
├──────────────────────────────────────────────────────────┤
│ Static output      renderStaticMapSvg  svgToPngBlob      │
├──────────────────────────────────────────────────────────┤
│ Core (no React)    cameras · projections · geodata ·     │  low level
│                    ISO 3166 identity · great circles ·   │
│                    coordinate helpers · animation        │
└──────────────────────────────────────────────────────────┘
```

The core layer is plain TypeScript over d3-geo — usable from Node, workers, or a
future Canvas renderer. React components only consume serializable outputs (path
strings, projected points), following 's geometry/component split.

## Coordinates

GeoJSON order internally; app-friendly shapes accepted everywhere:

```ts
type LonLat = [lon: number, lat: number];
type Coordinate = LonLat | { lat: number; lng: number } | { lat: number; lon: number };
toLonLat(c: Coordinate): LonLat
```

Headings are navigational: degrees, 0° = north, clockwise ('s convention,
consumable directly by SVG `rotate()`).

## Country data & ISO identity

The package ships **no basemap**. Feed it any TopoJSON/GeoJSON (typically
`world-atlas`):

```ts
const world = prepareCountries(topology, {
  object?: string;                    // TopoJSON object name, default "countries"
  exclude?: string[];                 // any codes/ids, e.g. ["AQ"] to drop Antarctica
  patchFeatures?: (features) => features; // editorial fixes stay in the app
});
```

`prepareCountries` converts TopoJSON, then resolves each feature against a bundled
ISO 3166-1 table (numeric ↔ alpha-2 ↔ alpha-3 ↔ name) plus a Natural-Earth-name
override table (the union of 's and 's reconciliation maps). Result:

```ts
interface PreparedCountry {
  id: string;                  // canonical: lowercase alpha-2, else numeric, else name slug
  numeric: string | null;      // "840"
  alpha2: string | null;       // "US"
  alpha3: string | null;       // "USA"
  name: string;
  feature: Feature;
  centroid: LonLat;
  bounds: [LonLat, LonLat];    // geographic bbox
}
interface CountrySet {
  countries: PreparedCountry[];
  get(codeOrName: string): PreparedCountry | undefined;  // any code, any case
}
```

`get("US") === get("usa") === get("840") === get("United States of America")`.
Low-level identity helpers are exported too: `lookupIso(code)`, `resolveCountryName(name)`.

## `<GeoMap>` and `<GeoGlobe>`

```tsx
<GeoMap
  countries={{
    data: world,
    fill: (c) => spendColor(c.id),      // undefined → theme.land
    stroke?: string,
    pattern: (c) => "hatch" | "dots" | undefined,  // non-color state encoding
    selectedId?: string | null,
    onSelect?: (c: PreparedCountry | null) => void, // null = ocean click
    onHover?: (hover: { country; point: [x, y] } | null) => void,
  }}
  markers={markers} onMarkerClick={m => …} renderMarker={(m, ctx) => <MyPin/>}
  routes={routes}
  live={{ objects, transitionMs?: 1000, renderObject?: (o, ctx) => <Plane/> }}
  projection="naturalEarth1"            // | "mercator" | "equalEarth" | (size) => GeoProjection
  camera={camera}                       // optional handle from useMapCamera()
  fit="world"                           // | Coordinate[] | { country: string } — declarative refit
  interactive wheelZoom keyboard        // all default true
  graticule={false}
  theme={{ land: "var(--muted)" }}      // deep-merged over defaultTheme
  width={960} height={500}              // viewBox; element itself is 100%/100%
  aria-label="Where we operate"
  className style
>
  <MyCustomSvgLayer />                  {/* rendered in projected space, see useGeo */}
</GeoMap>
```

`<GeoGlobe>` takes the same props minus `projection`, plus
`inertia` (default true) and `autoRotate?: number` (deg/s, pauses on interaction,
disabled under reduced motion). Orthographic, `clipAngle(90)`, drag-to-rotate with
zoom-scaled degrees-per-pixel and latitude clamped at the poles ('s model).

Marker / route / live shapes (all generic over `data`):

```ts
interface GeoMarker<T = unknown> {
  id: string; coordinates: Coordinate;
  kind?: "city" | "airport" | "point" | (string & {});
  label?: string; size?: number; color?: string; data?: T;
}
interface GeoRoute<T = unknown> {
  id: string; stops: Coordinate[];        // ≥2 → multi-stop great-circle chain
  color?: string; width?: number; dashed?: boolean; opacity?: number; data?: T;
}
interface LiveObject<T = unknown> {
  id: string; coordinates: Coordinate;
  heading?: number;                        // deg, 0 = N, clockwise
  label?: string; color?: string; trail?: Coordinate[]; data?: T;
}
```

Live objects animate **between prop updates**: when `coordinates` change, the layer
slerps along the great circle from the previous position (and takes the shortest arc
for heading) over `transitionMs`, on one shared rAF loop per map. Feed it real
positions at any cadence; under reduced motion it jumps.

## Cameras

```ts
const camera = useMapCamera({ center?, zoom?, minZoom?, maxZoom? });
camera.view                    // { center: LonLat, zoom }
camera.zoomIn(); camera.zoomOut(); camera.zoomTo(z); camera.panBy(dxPx, dyPx);
camera.reset();
camera.flyTo({ center?, zoom? }, { durationMs? });    // 600 ms ease-in-out, rAF
camera.fitTo("world" | Coordinate[] | GeoBounds | PreparedCountry, { padding?, maxZoom? });
camera.set({ center?, zoom? });                        // no animation

const globe = useGlobeCamera({ rotation?, zoom?, minZoom?, maxZoom? });
globe.view                     // { rotation: [λ, φ, γ], zoom }
globe.focus(coordinate, { zoom?, durationMs? });       // rotate point to face camera
globe.flyTo({ rotation?, zoom? }, opts); globe.fitTo(coords);  // spherical-cap fit
globe.zoomIn/zoomOut/zoomTo/reset/set
```

Hooks wrap framework-free `createMapCamera()` / `createGlobeCamera()` stores
(subscribe/getSnapshot), so the same cameras will drive the future Canvas renderer.
Passing no `camera` prop gives an internal uncontrolled camera; `fit` still works.
All tweens and inertia check `prefers-reduced-motion` at start and jump instead.

## Interaction

Unified Pointer Events with 's deferred-capture trick (capture only after a
3 px move) so taps still click countries/markers. Drag pans (flat) or rotates
(globe, with 0.92-decay inertia). Wheel zooms at the cursor (`wheelZoom={false}`
for -style pages that must keep scrolling). Two-pointer pinch zooms at the
midpoint. Keyboard when focused: arrows pan/rotate, `+`/`-` zoom, `Home`/`0` reset.
Root SVG is `role="img"` with required `aria-label`, `tabIndex={0}`, and a
focus-visible outline.

## Custom layers

Children render inside the projected coordinate space. `useGeo()` exposes:

```ts
const { projection, path, size, project, isVisible } = useGeo();
// project(coordinate) → [x, y] | null   (null = clipped / globe backface)
// path(featureOrGeometry) → SVG d string
```

This is the documented SVG-coupled surface; everything else is renderer-agnostic.

## Theming

A flat object of CSS color strings — raw values or `var(--token)` both work, so
Tailwind/CSS-variable apps keep their tokens and static export can pass hexes:

```ts
interface GeoTheme {
  ocean; land; landStroke; landMuted; selectedStroke; graticule; sphere;
  marker; markerLabel; route; live; trail; patternInk;
}
defaultTheme: GeoTheme; darkTheme: GeoTheme;
```

## Static output (share images)

```ts
const svg = renderStaticMapSvg({
  countries?, markers?, routes?,        // same shapes as the components
  projection?, view?,                   // optional camera view to frame
  width, height, theme?, background?,
});
const blob = await svgToPngBlob(svg, { width, height, scale? });  // browser only
```

Pure string building on the core layer (no React, no DOM for the SVG step), matching
's WYSIWYG share pipeline; the PNG step uses Image + canvas and is browser-only.

## D3-level utilities (exported)

`createProjection(kind, size)`, `greatCirclePoints(a, b, n)`,
`interpolateGreatCircle(a, b, t)`, `bearingBetween(a, b)`, `haversineKm(a, b)`,
`geographicBounds(coords)`, plus the animation primitives `tween()` and easing.

## Future: Canvas escape hatch

Reserved, not implemented: a `renderer="canvas"` prop on both components. The
contract that makes it cheap later: core produces only data (path strings via
`geoPath` can target a Canvas context directly), cameras are store objects, and
custom SVG layers are the single explicitly SVG-only feature.

## Non-goals

Product data (countries datasets, flights, moments), fetching, state management,
tooltips/legend UI (the package reports hover data; apps own popover styling),
politics (border patches are app callbacks), and bundled basemaps.
