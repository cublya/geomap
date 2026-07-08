# API design

`@cublya/geomap` is a React + TypeScript + d3-geo library of map primitives. It owns
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
`@cublya/world-atlas`):

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
    outline?: Outline | ((c) => Outline | undefined), // border behaviour, per-feature if a fn
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

`<GeoView>` wraps both behind one surface with a built-in map⇄globe toggle:

```tsx
<GeoView
  {...sharedProps}                       // countries/markers/routes/live/theming
  mode="map" onModeChange={setMode}      // controlled; or defaultMode="map" uncontrolled
  projection projectionOptions           // map-only, ignored on the globe
  inertia autoRotate                     // globe-only, ignored on the map
  toggle                                 // true (default, top-left) | false | Partial<GeoViewToggleProps>
  controls                               // zoom cluster: true (default, bottom-right) | false | Partial<GeoControlsProps>
/>
```

It holds a `MapCamera` and a `GlobeCamera` (or accepts `mapCamera`/`globeCamera`)
and bridges the view on each switch: the flat centre `[lon, lat]` maps to the globe
facing `[-lon, -lat, 0]` (and back), with zoom remapped between the two cameras'
ranges — so flipping stays put instead of resetting.

The switch itself is `<GeoViewToggle mode onModeChange />` — a segmented ARIA
`radiogroup` of two always-visible options (flat map / globe) with the active one
highlighted. Usable standalone to drive your own `GeoMap`/`GeoGlobe` swap.

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

## Presets, theming & CSS

No CSS import is ever required; no Tailwind, resets, global CSS or runtime
CSS-in-JS in any mode. Presentation = SVG attributes + theme objects. The
package defaults to **fully unstyled** (`preset="none"`) — it never forces a
look on you — but built-in presets let you opt into a complete, polished
appearance with one prop and no CSS file.

Theming is three orthogonal axes: `preset` (colour mode), `palette`
(fill palette), and `countries.outline` (border behaviour — see below).

```ts
type GeoPreset = "light" | "dark" | "none";           // colour mode
type GeoPalette = "default" | "minimal";        // fill palette
type OutlineMode = "line" | "gap" | "raised" | "none";        // border behaviour
type Outline = OutlineMode | {
  mode?; color?; width?; dash?; elevation?;            // full style
};
interface GeoTheme {
  ocean; land; landMuted; landDisabled; landHover; landStroke; landShadow;
  selectedStroke; graticule; sphere; marker; markerLabel; route; live; trail;
  patternInk; focus; controlBg; controlInk; controlBorder;
  tooltipBg; tooltipInk; tooltipBorder;
}
// exported for composition — index by mode then palette, e.g. presets.dark.minimal
presets: { light: Record<GeoPalette, GeoTheme>;
           dark: Record<GeoPalette, GeoTheme>;
           none: ResolvedGeoTheme };
resolveTheme(preset?, variant?, overrides?): ResolvedGeoTheme; // preset defaults to "none"
resolveOutline(outline?, theme): ResolvedOutline;    // layer-agnostic border resolver
```

Palettes, both in light and dark: `default` (plain filled land) and `minimal`
(hue-less line-art — transparent ocean, faint fills). **Border behaviour is the
separate `countries.outline` axis** — a bare mode, a full style object, or a
`(country) => Outline | undefined` callback for per-feature borders: `line`
(hairline), `gap` (ocean-tone gaps so choropleth fills carry the map), `raised`
(`gap` + a soft `landShadow` drop shadow lifting the land), `none`. The old
bundled presets are palette × outline: crisp = `default` + `gap`, chalk =
`minimal` + `gap`, relief = `default` + `raised`. `resolveOutline` is
layer-agnostic so future region/coastline layers reuse it.

Palettes are OKLCH neutrals (no raw #fff/#000), AA ink/surface contrast, themed
`:focus-visible` rings, and deliberately generic — no brand colors, no metric
scales, no visited-country semantics. `"none"` emits no presentation attributes
at all — it's the literal default parameter value, not just one option among
equals.

Style precedence (lowest → highest):
1. package defaults — `preset="none"` (nothing painted)
2. selected `preset` + `palette` — `"light"`/`"dark"` × `"default"`/`"minimal"`, when you opt in
3. `theme` partial token overrides
4. per-feature callbacks — `countries.fill`/`pattern`/`disabled`/`outline`, `renderMarker`, `renderObject`
5. direct element props — `marker.color`, `route.color`, `countries.outline`, …

Consumer override channels, combinable:
- **Props** — `preset="dark"`, `theme={{ land: "…" }}` (values may be `var(...)`).
- **CSS variables** — every preset value is `var(--geomap-*, fallback)`;
  define the variables on any ancestor.
- **Class names** (always present, all presets included `"none"`): `geomap`,
  `geomap-map`/`-globe`, `geomap-country` (+ `[data-country]`,
  `[data-selected]`, `[data-disabled]`), `-hover`, `-pattern`, `-selection`,
  `-route`, `-marker`, `-label`, `-live`, `-trail`, `-graticule`, `-sphere`.

`GeoControls` (zoom in/out/reset as SVG-icon buttons — `separate` rounded tiles
by default, or `layout="segmented"` for one hairline-divider pill) and
`GeoTooltip` (optional HTML helpers) take the same `preset`/`theme` props, also
defaulting to `"none"`; pass the same preset as your map for a matching, complete
look (shadow + icons included, no CSS file). Pass `fullscreen={ref}` (the map
wrapper's element/ref) to append a Fullscreen-API toggle button. The separate
`GeoViewToggle` (a segmented map⇄globe `radiogroup`, what `<GeoView>` wires up)
shares the same styling channels. Every built-in glyph is swappable via an
`icons` slot — the package ships no icon dependency. The optional
`@cublya/geomap/styles.css` adds only hover/active/focus-visible polish —
namespaced under `.geomap-*`, it styles nothing else.

Three styling channels, combinable — designed so utility CSS (Tailwind) and raw
CSS both work without fighting inline styles:
- **`preset`/`theme`** — complete inline look from tokens (default channel).
- **`classNames` slots** — `{ root, button, zoomIn, zoomOut, reset, fullscreen }`
  (and `{ root, option, map, globe }` on `GeoViewToggle`), appended after the base
  classes; the Tailwind seam.
- **Headless (`preset="none"`)** — emits **no** inline styles, only the semantic
  `.geomap-controls*` classes and `data-geomap-part` (`controls`/`zoom-in`/
  `zoom-out`/`reset`/`fullscreen`/`tooltip`) + `data-geomap-orientation` /
  `data-geomap-layout` hooks for raw CSS.

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
