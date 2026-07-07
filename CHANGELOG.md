# Changelog

All notable changes to this package are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this package adheres to [Semantic Versioning](https://semver.org/). It is
currently pre-1.0 (`0.1.0`, unreleased), so the public API may still change.

## [Unreleased]

### Added

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
- Built-in visual presets — complete looks with zero CSS imports, via SVG
  attributes and theme objects: `light`, `dark`, `minimal`, and `none`
  (**the default** — fully unstyled; pass `preset="light"` etc. to opt into a
  polished look with no CSS file). OKLCH neutral palettes, AA contrast, no raw
  `#fff`/`#000`, no product branding.
- `preset` prop + `theme` partial token overrides + exported `presets` objects
  for composition + `--geomap-*` CSS variables for global overrides +
  semantic `geomap-*` class names (with `data-country` / `data-selected` /
  `data-disabled`), always present regardless of preset.
- Optional `GeoControls` and `GeoTooltip` HTML helpers, also defaulting to
  `preset="none"`; pass a preset for a complete out-of-the-box look. The
  optional `@cublya/geomap/styles.css` adds only pseudo-class polish for them
  (namespaced, cannot leak).
- Vitest unit suite; Storybook (React + Vite) demo/docs site with interaction +
  axe accessibility tests; Playwright screenshot tests; publint; Vite and
  Next.js fixture apps built from the packed tarball; GitHub Pages deploy of
  Storybook from `main`.

### Changed

- Renamed the package from `@cublya/geo` to `@cublya/geomap` (CSS/class prefix
  `geo-*` → `geomap-*`, CSS variables `--geo-*` → `--geomap-*`) for a more
  literal, obvious name.
