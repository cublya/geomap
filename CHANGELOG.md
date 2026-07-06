# Changelog

## 0.1.0 (unreleased)

Initial release.

### Components & core

- `<GeoMap>` (Mercator / Natural Earth / Equal Earth / custom d3 projection) and
  `<GeoGlobe>` (orthographic, drag-rotate with inertia, optional auto-rotate).
- `prepareCountries()`: TopoJSON/GeoJSON preprocessing with full ISO 3166-1
  identity (alpha-2/alpha-3/numeric/name lookup) and Natural Earth name
  reconciliation.
- Country choropleth fills, hatch/dot state patterns, selection, hover
  reporting, `disabled` countries.
- Generic markers (city/airport/point) with counter-scaling and custom
  renderers; multi-stop great-circle routes.
- Live objects: heading-rotated glyphs tweened between position updates on a
  shared rAF loop, with optional trails.
- Cameras (`useMapCamera` / `useGlobeCamera` + framework-free stores): pan,
  zoom, fly-to, focus, fit-to (world/coords/bounds/country), reset, inertia.
- Pointer (mouse/touch/pen) gestures with deferred capture, wheel + pinch zoom,
  keyboard controls, `prefers-reduced-motion` support, themed focus indicators.
- Custom SVG layers via `useGeo()`; static `renderStaticMapSvg()` +
  `svgToPngBlob()` share images; server-safe imports (usable in React Server
  Components).

### Styling

- Built-in visual presets — complete looks with zero CSS imports, via SVG
  attributes and theme objects: `light` (default), `dark`, `minimal`, and
  `none` (explicitly unstyled). OKLCH neutral palettes, AA contrast, no raw
  #fff/#000, no product branding.
- `preset` prop + `theme` partial token overrides + exported `presets` objects
  for composition + `--cublya-geo-*` CSS variables for global overrides +
  semantic `cublya-geo-*` class names (with `data-country` / `data-selected` /
  `data-disabled`).
- Style precedence: package defaults → preset → theme overrides → per-feature
  callbacks → direct element props.
- Tokens cover ocean/background, default/hover/selected/disabled countries,
  borders, markers, routes, live objects, focus indicators, and the optional
  controls/tooltip surfaces.
- Optional `GeoControls` and `GeoTooltip` HTML helpers, complete out of the box
  from preset tokens; the optional `@cublya/geo/styles.css` adds only
  pseudo-class polish for them (namespaced, cannot leak).

### Tooling

- Vitest unit suite; Storybook (React + Vite) demo/docs site with interaction +
  axe accessibility tests; Playwright screenshot tests; publint; Vite and
  Next.js fixture apps built from the packed tarball; GitHub Pages deploy of
  Storybook from `main`.
