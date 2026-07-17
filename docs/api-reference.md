# API reference

All public values are exported from `@cublya/geomap`. This reference groups the
surface by purpose; exported TypeScript declarations remain the exact source of
truth.

## React surfaces

### `GeoMap`

Renders an interactive flat map. SVG is the default renderer; pass
`renderer="canvas"` for a Canvas-backed surface.

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `countries` | `CountriesLayerProps` | - | Prepared country layer and callbacks |
| `markers` | `GeoMarker<T>[]` | - | Projected markers |
| `showMarkerLabels` | `boolean` | `true` | Show visible marker labels (SVG titles remain) |
| `routes` | `GeoRoute<T>[]` | - | Great-circle (default) or straight, multi-stop routes |
| `live` | `LiveLayerComponentProps<T>` | - | Prop-driven moving objects |
| `projection` | `ProjectionInput` | `naturalEarth1` | Named projection or factory |
| `projectionOptions` | `FlatProjectionOptions` | - | Projection tuning |
| `camera` | `MapCamera` | internal | External camera store |
| `fit` | `FitTarget` | - | Reframe when target changes |
| `fitCurve` | `arc \| linear` | `arc` | Declarative fit animation path |
| `interactive` | `boolean` | `true` | Enables pointer interaction |
| `wheelZoom` | `boolean` | `true` | Enables wheel zoom |
| `keyboard` | `boolean` | `true` | Enables keyboard and focusability |
| `graticule` | `boolean` | `false` | Draw coordinate grid |
| `preset` | `GeoPreset` | `none` | `none`, `light`, or `dark` |
| `palette` | `GeoPalette` | `filled` | `filled` or `minimal` |
| `theme` | `Partial<GeoTheme>` | - | Token overrides |
| `width`, `height` | `number` | `960`, `500` | Internal coordinate system |
| `renderer` | `GeoRenderer` | `svg` | `svg` or `canvas` |
| `aria-label` | `string` | `Interactive map` | Use a data-specific label |
| `children` | `ReactNode` | - | Custom projected SVG layers |

`onMarkerClick` receives the typed marker. `renderMarker(marker, context)` can
replace the default marker; context contains projected `position` and
`counterScale`.

`GeoMarker` accepts `selected` (a `theme.markerSelected` ring behind the dot),
`stroke`, and `strokeWidth`; `stroke` overrides the marker dot's `halo` casing.
`GeoRoute.geometry` is `"great-circle"` by default or `"straight"` to join only
the supplied stops. `showMarkerLabels` is also available on `GeoGlobe` and
`GeoView`, and on `renderStaticMapSvg` options.

### `GeoGlobe`

Renders an orthographic globe. Shared layer, styling, interaction, renderer, size, and
children props match `GeoMap`. Globe-specific props are:

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `camera` | `GlobeCamera` | internal | External globe camera |
| `fit` | `FitTarget` | - | Reset or frame coordinates/country |
| `inertia` | `boolean` | `true` | Post-drag decay |
| `autoRotate` | `number` | - | Idle degrees per second |
| `graticule` | `boolean` | `true` | Coordinate grid |
| `width`, `height` | `number` | `960`, `540` | SVG viewBox dimensions |

Flat `projection`, `projectionOptions`, and `fitCurve` props do not apply.

### `GeoView`

Switches between `GeoMap` and `GeoGlobe`, transfers centre/zoom, and optionally
overlays `GeoViewToggle` and `GeoControls`.

Important props:

- `mode` and `onModeChange` for controlled mode.
- `defaultMode` (`map`) for uncontrolled mode.
- `mapCamera` and `globeCamera` for external camera ownership.
- `toggle`: `true`, `false`, or partial `GeoViewToggleProps`.
- `controls`: `true`, `false`, or partial `GeoControlsProps`.
- `projection*` applies only to map mode; `inertia` and `autoRotate` apply only
  to globe mode.
- `renderer` applies to whichever surface is active.

The wrapper fills its containing block and is positioned relative for overlays.

## Country layer

`CountriesLayerProps` contains:

| Field | Purpose |
| --- | --- |
| `data` | Required `CountrySet` from `prepareCountries` |
| `fill(country)` | Per-country fill; `undefined` means muted/no-data |
| `outline` | Layer outline or per-country outline callback |
| `selectedOutline` | Selection border override |
| `pattern(country)` | `hatch`, `dots`, or no overlay |
| `disabled(country)` | Makes a country dim and inert |
| `selectedId` | Controlled canonical selection ID |
| `onSelect(country)` | Selected country, or `null` for ocean |
| `onHover(hover)` | Country and client point, or `null` on leave |
| `hover` | Fade options or `false` for instant highlight |
| `nativeTitle` | Controls native SVG title emission |

`CountriesLayer`, `MarkersLayer`, `RoutesLayer`, `LiveLayer`, and
`GraticuleLayer` are also exported for custom SVG composition inside
`GeoProvider`. In Canvas mode, custom React layers and custom marker/live
renderers are mounted in a projected SVG overlay.

## Optional UI

### `GeoControls`

Accepts any `CameraControlsHandle` with `zoomIn`, `zoomOut`, and `reset` methods.
`orientation` is vertical or horizontal. `layout` is separate (default) or
segmented. `fullscreen` accepts an element, ref, or element getter. `classNames`,
`icons`, and `labels` customize each part without replacing behavior.
`wrapButton` can wrap each rendered button with a design-system tooltip trigger;
`nativeTitle` controls browser title tooltips.

### `GeoViewToggle`

A controlled `map | globe` radiogroup. Pass `mode` and `onModeChange`. It supports
the same preset/palette/theme model, per-part class names, custom icons, and
localized labels. `wrapOption` can wrap each rendered option with a
design-system tooltip trigger; `nativeTitle` controls browser title tooltips.

### `GeoTooltip`

Renders optional hover content above a client-space point. It supports preset
and theme styling, custom content, class/style hooks, and optional flag rendering.
`flagEmoji(alpha2)` returns a regional-indicator flag string for valid alpha-2
codes. Flag rendering is platform-dependent and should not be the only country
identifier.

## Cameras

### Map camera

Create with `createMapCamera(options)` or `useMapCamera(options)`.

Options: `center`, `zoom`, `minZoom` (default 1), and `maxZoom` (default 8).

Public operations:

- `getView()` / `view`: `{ center, zoom }` snapshot.
- `subscribe(listener)`: external-store subscription.
- `set(partial)`: immediate update.
- `panBy(dxPx, dyPx)`.
- `zoomIn()`, `zoomOut()`, `zoomTo(zoom)`, `zoomAtPixel(factor, point)`.
- `flyTo(partialView, { durationMs, curve })`.
- `fitTo(target, { coverage, maxZoom, curve })`.
- `reset(options)` and `stopAnimations()`.

`FitTarget` is `world`, a coordinate list, geographic bounds, or a
`PreparedCountry`. Coverage is the target's maximum fraction of the frame and
defaults to 0.7.

### Globe camera

Create with `createGlobeCamera(options)` or `useGlobeCamera(options)`.

Options: `rotation`, `zoom`, `minZoom` (default 1), and `maxZoom` (default 6).

Public operations include the shared snapshot, subscription, set, zoom, fly,
reset, and stop methods, plus:

- `rotateBy(dLambda, dPhi)`.
- `focus(coordinate, options)` to face one coordinate.
- `fitTo(coordinates, options)` to frame a spherical cap.
- `startInertia([lambdaVelocity, phiVelocity])`.

Use `useMapView(camera)` and `useGlobeView(camera)` for reactive camera reads in
React components.

## Geographic data

### `prepareCountries(source, options)`

Converts TopoJSON or GeoJSON into a `CountrySet`. Options are `object`, `exclude`,
and `patchFeatures`. See [Data and rendering](data-and-rendering.md).

### Identity

- `lookupIso(code)` resolves known numeric, alpha-2, or alpha-3 codes.
- `resolveCountryName(name)` reconciles known Natural Earth names.
- `normalizeName(name)` provides normalized comparison text.
- `ISO_3166_1` is the bundled table.

### Primary types

- `Coordinate`, `LonLat`, `GeoBounds`, `Rotation`.
- `PreparedFeature`, `PreparedCountry`, `CountrySet`.
- `GeoMarker<T>`, `GeoRoute<T>`, `LiveObject<T>`.

## Projections and custom layers

- `createFlatProjection(input, size, options)`.
- `createGlobeProjection(size)` and `configureGlobe(...)`.
- `useGeo()` returns active projection context.
- `clientToViewBox` converts browser client coordinates into SVG viewBox space.

Named flat projections are `naturalEarth1`, `mercator`, and `equalEarth`.

## Geometry utilities

- `toLonLat` normalizes coordinate shapes.
- `haversineKm` returns great-circle distance in kilometres.
- `angularDistance` returns spherical angular separation.
- `bearingBetween` returns navigation heading.
- `interpolateGreatCircle` returns a point along a great circle.
- `greatCirclePoints` samples a great-circle arc.
- `sphericalCentroid` and `geographicBounds` summarize coordinate collections.
- `shortestAngleDelta` finds a wrapped angular delta.
- `routePoints` and `routeLineString` build sampled multi-stop routes.

## Theme and outline utilities

- `presets`, `resolveTheme`, and `cx`; `GeoTheme.markerSelected` is the fill
  token for selected marker rings (`--geomap-marker-selected`).
- `resolveOutline` converts an `Outline` into color, width, dash, raised state,
  and elevation.
- `GeoPreset`, `GeoPalette`, `GeoTheme`, `ResolvedGeoTheme`.
- `Outline`, `OutlineMode`, `OutlineStyle`, `ResolvedOutline`.

## Animation utilities

- `tween(options)` starts a cancellable request-animation-frame tween.
- `startDecay(options)` starts cancellable velocity decay.
- `easeInOutQuad` is the default easing primitive.
- `prefersReducedMotion()` reads the current media preference.
- `usePrefersReducedMotion()` subscribes from React.

These helpers use browser animation APIs when available. Call the returned
`Cancel` function during cleanup.

## Static output

### `renderStaticMapSvg(options)`

Returns a standalone flat SVG string. Required options are `width` and `height`.
Optional inputs include countries, markers, routes, projection, projection
options, graticule, preset, palette, theme, and background.

### Conversion helpers

- `escapeXml(text)` escapes XML-sensitive characters.
- `svgToDataUrl(svg)` returns a percent-encoded SVG data URL.
- `svgToPngBlob(svg, options)` rasterizes in a browser. Options include output
  width, height, scale (default 2), MIME type, and quality.
