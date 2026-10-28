# Alternatives and positioning (checked 2026-10-18)

Internal research notes. Public copy describes these by category, not by name.

| Package | Category | Observed positioning (npm description) | Last npm modification |
| --- | --- | --- | --- |
| react-simple-maps | React components on d3-geo | "React components to build maps with d3-geo, with optional zoom/pan support" | 2026-09-12 |
| @visx/geo | Low-level visualization primitives | "visx geo" (part of a chart primitive kit) | 2026-06-11 |
| @nivo/geo | Chart library with a choropleth chart type | (no description) | 2025-05-23 |
| react-globe.gl | WebGL globe | "React component for Globe Data Visualization using ThreeJS/WebGL" | 2026-05-16 |
| react-map-gl | Tile/vector-tile slippy maps | "React components for MapLibre GL JS and Mapbox GL JS" | 2026-09-02 |
| react-leaflet | Raster tile slippy maps | "React components for Leaflet maps" | 2024-12-14 |

Source: `npm view <pkg> version time.modified description`, run 2026-10-18.

## Where @cublya/geomap differs (from the code, not from claims)

- Flat map and orthographic globe share one props surface (`GeoMap`, `GeoGlobe`, `GeoView` with a toggle), `src/react/`.
- ISO 3166-1 identity resolution with name reconciliation, `src/core/iso.ts`, `src/core/geodata.ts`.
- SVG by default, Canvas optional (`renderer="canvas"`), `src/react/canvas-renderer.tsx`.
- Static SVG/PNG export with the same pipeline, `src/static/render-svg.ts`.
- Camera stores with fit, focus, fly-to, `src/core/camera-map.ts`, `src/core/camera-globe.ts`.
- No basemap, tiles, API keys or WebGL; geometry is brought by the app.

## Categories for public comparison copy

1. Using d3-geo directly: full control, you write projection fitting, gestures, ISO joins, a11y.
2. Chart libraries with a geo chart type: quick choropleths, fewer map interactions (globe, routes, cameras).
3. Tile-based slippy maps: streets, zoom to building level, tile provider or self-hosted tiles needed.
4. WebGL globes: 3D scenes and large point clouds; heavier runtime, no SVG/CSS styling.
