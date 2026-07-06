# Changelog

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
