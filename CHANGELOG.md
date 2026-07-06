# Changelog

## 0.2.0

CSS architecture, optional UI helpers, and a Storybook documentation site.

- Theme modes: `"light"` (default), `"dark"`, `"unstyled"`, or partial overrides.
  Built-in palettes now expose `var(--cublya-geo-*, fallback)` hooks so apps can
  retheme via CSS variables; `"unstyled"` emits no presentation attributes.
- Stable `cublya-geo-*` class names on every rendered element (plus
  `data-country` / `data-selected`) for CSS-driven styling.
- New optional components: `GeoControls` (zoom/reset buttons for either camera)
  and `GeoTooltip` (pointer-anchored tooltip). Functional without CSS; cosmetics
  in the new optional `@cublya/geo/styles.css` export (fully namespaced, no
  leakage, no resets).
- Server-safe imports: the module now evaluates inside React Server Components,
  so `prepareCountries`/`renderStaticMapSvg` work in RSC; components render in
  client boundaries (verified by a Next.js fixture build).
- `onMarkerClick` now also fires for markers drawn with `renderMarker`.
- Public-surface type packages (`@types/d3-geo`, `@types/geojson`,
  `@types/topojson-specification`) moved to dependencies so consumers get types
  without extra installs.
- Storybook (React + Vite) demo/docs site with interaction + axe accessibility
  tests, Playwright screenshot tests, publint, and Vite/Next.js tarball fixture
  builds; GitHub Pages deploy from `main`.
- Deprecated: `defaultTheme` (alias of `lightTheme`) and `mergeTheme`
  (use `resolveTheme`).

## 0.1.0

Initial release.

- `<GeoMap>` (Mercator / Natural Earth / Equal Earth / custom d3 projection) and
  `<GeoGlobe>` (orthographic, drag-rotate with inertia, optional auto-rotate).
- `prepareCountries()` TopoJSON/GeoJSON preprocessing with full ISO 3166-1
  identity (alpha-2/alpha-3/numeric/name lookup) and Natural Earth name
  reconciliation.
- Country choropleth fills, hatch/dot state patterns, selection, hover reporting.
- Generic markers (city/airport/point) with counter-scaling and custom renderers.
- Great-circle routes with multi-stop support.
- Live objects: heading-rotated glyphs tweened between position updates on a
  shared rAF loop, with optional trails.
- Cameras (`useMapCamera` / `useGlobeCamera` + framework-free stores):
  pan, zoom, fly-to, focus, fit-to (world/coords/bounds/country), reset, inertia.
- Pointer (mouse/touch/pen) gestures with deferred capture, wheel + pinch zoom,
  keyboard controls, `prefers-reduced-motion` support.
- Custom SVG layers via `useGeo()`.
- Theme objects (CSS variables welcome), light + dark defaults.
- Static output: `renderStaticMapSvg()` and `svgToPngBlob()` for share images.
- Low-level exports: spherical math, projections, animation primitives.
