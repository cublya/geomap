# Data and rendering

## Coordinate conventions

All internal tuples use GeoJSON order: `[longitude, latitude]`. Public APIs also
accept `{ lat, lng }` and `{ lat, lon }` objects through the `Coordinate` type.

```ts
toLonLat([16.37, 48.2]);
toLonLat({ lat: 48.2, lng: 16.37 });
toLonLat({ lat: 48.2, lon: 16.37 });
// all return [16.37, 48.2]
```

Do not pass `[latitude, longitude]`; both values can be numerically valid, so the
library cannot detect the reversal reliably.

Headings use navigation convention: `0` is north and values increase clockwise.
Projection rotations use d3's `[lambda, phi, gamma]` degrees.

## Preparing country geometry

`prepareCountries` accepts a TopoJSON topology or GeoJSON FeatureCollection:

```ts
const countries = prepareCountries(source, {
  object: "countries",
  exclude: ["AQ"],
  patchFeatures: (features) => features,
});
```

- `object` selects a TopoJSON object and defaults to `countries`.
- `exclude` accepts any identity understood by the resulting lookup, including
  ISO codes and normalized names.
- `patchFeatures` runs after source conversion and before final preparation. It
  is the explicit hook for geometry correction or editorial policy.

Preparation resolves numeric, alpha-2, alpha-3, canonical name, centroid, and
geographic bounds. Features that cannot resolve to ISO still receive a stable
fallback ID derived from source identity or name.

Use `CountrySet.get` at application boundaries:

```ts
countries.get("DE");
countries.get("deu");
countries.get("276");
countries.get("Germany");
```

The lookup is forgiving; application storage should still prefer one canonical
scheme, usually uppercase alpha-2 or alpha-3.

## Choosing an atlas resolution

Higher-resolution basemaps increase bundle size, preparation work, SVG path
size, and render cost. Select the lowest resolution that supports the product's
visual size and country coverage requirements.

- 110m is suitable for small overview maps but omits some small countries.
- 50m is a balanced general-purpose choice.
- 10m is appropriate for large maps, exports, and detailed country selection.

See [Basemap coverage](basemap-coverage.md) for exact coverage and the command
used to verify it.

## Joining product data

Prepare geometry separately from product records. Build a lookup map before
rendering instead of scanning an array inside each `fill` callback:

```ts
const values = new Map(records.map((record) => [record.countryCode, record.value]));

const fill = (country: PreparedCountry) => {
  const key = country.alpha2;
  const value = key ? values.get(key) : undefined;
  return value == null ? undefined : scale(value);
};
```

Memoize the lookup and callbacks when records change frequently. Keep callback
results deterministic: layers may evaluate them again when projection or theme
state changes.

## Layer inputs

Countries are a configured layer object. Markers, routes, and live objects are
plain arrays and can carry typed application data through their generic `data`
field.

```ts
const markers: GeoMarker<{ airportId: number }>[] = [
  {
    id: "vie",
    coordinates: { lat: 48.11, lng: 16.57 },
    kind: "airport",
    label: "VIE",
    data: { airportId: 42 },
  },
];
```

Routes require at least two stops to render. Each consecutive pair becomes a
sampled great-circle segment. A route can cross the antimeridian without the
straight-line wrap artifacts produced by planar interpolation.

Live objects interpolate between successive coordinate props. The library does
not fetch or schedule feed updates; pass each new observation from the host. A
trail is a static coordinate array and should be bounded by the application to
avoid unbounded DOM and path growth.

## Projections

Flat surfaces support `naturalEarth1` (default), `mercator`, and `equalEarth`.
Use `projectionOptions` for projection-specific tuning or pass a projection
factory when the named presets are insufficient.

```tsx
<GeoMap
  projection="mercator"
  projectionOptions={{ rotate: [-12, 0, 0] }}
  countries={{ data: countries }}
/>
```

A custom projection factory receives the viewBox size. It must return a d3
`GeoProjection`; an invertible projection is required for correct flat-camera
pan, cursor-centred zoom, and fit behavior.

`GeoGlobe` always uses an orthographic projection with 90-degree clipping.

## Custom layers

Custom React children can use the active projection context:

```tsx
function Ring({ at }: { at: Coordinate }) {
  const { project, counterScale } = useGeo();
  const point = project(at);
  if (!point) return null;
  return (
    <circle
      cx={point[0]}
      cy={point[1]}
      r={10 * counterScale}
      fill="none"
      stroke="currentColor"
      strokeWidth={2 * counterScale}
    />
  );
}
```

`useGeo` exposes:

- `projection`: configured d3 projection.
- `path`: configured d3 path generator.
- `size`: viewBox width and height.
- `project(coordinate)`: projected point or `null` when clipped/hidden.
- `isVisible(coordinate)`: globe-aware visibility test.
- `counterScale`: inverse flat-map zoom; `1` on a globe.
- `theme`: resolved presentation tokens.

`useGeo` throws when called outside a map or globe provider. Custom children are
SVG-coupled; do not assume they will appear in `renderStaticMapSvg`.

## Static rendering

`renderStaticMapSvg` produces a standalone flat SVG string without React or a
DOM. It supports countries, markers, routes, graticules, flat projections,
outlines, presets, and theme overrides.

```ts
const svg = renderStaticMapSvg({
  width: 1200,
  height: 630,
  background: "#101418",
  countries: { data: countries, fill },
  routes,
  markers,
  preset: "dark",
});
```

For reliable standalone output, use a preset with fallback values or pass
concrete colors. A bare CSS variable without a fallback depends on a containing
document and may not render in image services.

`svgToDataUrl` is environment-independent. `svgToPngBlob` is browser-only and
uses an image element and canvas. The output canvas dimensions are
`width * scale` by `height * scale`; the default scale is 2.

Treat text and user-provided labels as untrusted input. The built-in static
renderer escapes marker labels and color attributes, but custom post-processing
must preserve XML escaping.

## Performance checklist

- Call `prepareCountries` at module scope or memoize it by source identity.
- Pre-index business data by country code.
- Keep marker and route object identities stable when values have not changed.
- Bound live trails and feed update frequency.
- Prefer 50m/110m geometry for small widgets.
- Avoid expensive scale computation inside per-country callbacks.
- Use the Performance Storybook story and a production build for profiling.
- Use `renderer="canvas"` for denser scenes with many rapidly changing built-in
  objects; keep SVG when DOM inspection and CSS styling matter more.
