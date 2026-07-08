# Examples

Self-contained, typechecked usage examples (each mirrors one of the Cublya apps the
package was distilled from). They import `@cublya/geomap` via the repo's tsconfig path
alias, so `npm run typecheck` keeps them honest.

To run one in a real app, copy the file into any React project that has
`@cublya/geomap`, `react` and `@cublya/world-atlas` installed.

| File | Shows |
| --- | --- |
| [`choropleth-map.tsx`](choropleth-map.tsx) | Metric choropleth, hover tooltip data, selection, fly-to, zoom buttons () |
| [`passport-globe.tsx`](passport-globe.tsx) | Visited/wishlist state fills + colour-blind-safe patterns, globe with inertia () |
| [`live-flights.tsx`](live-flights.tsx) | Great-circle routes, animated planes with heading, camera fit to route () |
| [`moments-journey.tsx`](moments-journey.tsx) | Spend ramp choropleth, journey pins + multi-stop arcs, auto-fit () |
| [`share-image.ts`](share-image.ts) | Static SVG + PNG share-image generation ('s share editor) |
