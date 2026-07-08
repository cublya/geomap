# Architecture

## Design goals

`@cublya/geomap` is a small geometry and presentation library, not a mapping
platform. It owns projection, camera state, SVG rendering, pointer interaction,
and reusable geographic math. Consumers own basemap files, network requests,
business data, editorial boundaries, legends, and product copy.

The public surface is split into four layers:

```text
Consumer application
  └─ React surfaces and optional UI
       ├─ GeoMap / GeoGlobe / GeoView
       ├─ layer components and useGeo
       └─ controls, tooltip, and camera hooks
            └─ framework-free core
                 ├─ camera stores and animation
                 ├─ projections and coordinates
                 ├─ country/ISO preparation
                 └─ routes and outlines
                      └─ d3-geo / topojson-client

Static renderer ────────────────┘
```

`src/index.ts` is the package contract. Internal modules may change without a
release note; anything exported there must be treated as public.

## Source layout

| Path | Responsibility |
| --- | --- |
| `src/core/` | React-free geometry, projections, camera stores, ISO matching, routes, animation |
| `src/react/` | React surfaces, projected SVG layers, gestures, hooks, controls, context |
| `src/static/` | Standalone SVG strings and browser PNG conversion |
| `src/theme.ts` | Preset tokens, palette resolution, class-name composition |
| `src/types.ts` | Shared public data types |
| `examples/` | Typechecked integration scenarios |
| `stories/` | Interactive feature and accessibility demonstrations |
| `fixtures/` | Packed-package smoke tests for Vite and Next.js |
| `playwright/` | Cross-browser visual regression tests |

## Runtime data flow

1. `prepareCountries` converts a consumer-owned TopoJSON or GeoJSON source into
   a `CountrySet`, normalizes identity, and precomputes centroids and bounds.
2. A surface creates or receives a camera store and subscribes with
   `useSyncExternalStore`.
3. The surface configures a d3 projection from its viewBox and camera view.
4. `GeoProvider` publishes projection helpers, resolved theme tokens,
   visibility, scale compensation, and generated SVG definition IDs.
5. Layers convert prepared features and coordinates into SVG paths or points.
6. Gesture handlers update the camera store. Camera notifications trigger a
   render with the next view.

Flat maps keep the projection stable and apply camera pan/zoom through a group
transform. Globes reconfigure the orthographic projection when rotation or zoom
changes because hemisphere clipping is projection-dependent.

## Camera ownership

Cameras are mutable external stores with immutable snapshots. They intentionally
exist outside React so they can be shared, tested without rendering, and reused
by future renderers.

- Omit the `camera` prop for component-owned, uncontrolled state.
- Use `useMapCamera` or `useGlobeCamera` for a stable React-owned handle.
- Use `createMapCamera` or `createGlobeCamera` when ownership is outside React.
- Use `useMapView` or `useGlobeView` only when a component needs reactive view
  values. Reading `camera.view` alone does not subscribe React.

Only `GeoMap` attaches projection dimensions to a map camera. Calls to
`fitTo` made before attachment are queued by the store and applied after layout.

## Rendering and composition

Built-in layer order is stable:

1. SVG definitions
2. graticule
3. countries
4. routes
5. markers
6. live objects
7. custom children

Custom children run inside the active `GeoProvider`. On a flat map they are also
inside the camera transform, so use `counterScale` for screen-constant sizes. On
a globe, call `project` rather than the raw projection when the element must be
culled on the hidden hemisphere.

The static renderer shares projection, route, theme, and outline logic with the
React renderer, but it is intentionally smaller: flat maps only, and no
interaction, live objects, patterns, selected state, React children, or custom
marker renderers.

## Styling boundary

SVG presentation is expressed as attributes resolved from theme tokens.
`preset="none"` leaves presentation attributes undefined wherever possible.
The optional stylesheet is restricted to pseudo-class polish for HTML controls
and tooltip helpers. There is no global reset, runtime CSS-in-JS, or Tailwind
runtime dependency.

This boundary preserves tree shaking and allows product applications to own
their design systems without specificity conflicts.

## Data and political boundaries

The package includes ISO identity metadata, not geographic boundaries. The atlas
source determines geometry and boundary policy. `patchFeatures` exists so a
consumer can apply explicit editorial decisions before preparation; the library
does not silently rewrite borders.

Keep this distinction when adding features:

- Generic identity reconciliation belongs in `core/iso`.
- Atlas coverage documentation belongs in `docs/basemap-coverage.md`.
- Product-specific territory treatment belongs in the consuming app.

## Performance model

- `CountrySet` preparation is expected to happen once per imported dataset.
- Country paths are memoized by data set and configured path generator.
- Flat-map zoom uses one SVG group transform instead of regenerating geometry.
- Globe rotation snaps projection updates to roughly half a screen pixel.
- Live objects share one animation-frame loop per layer.
- Markers counter-scale on flat maps and hidden-hemisphere objects are omitted on
  globes.

For very large dynamic point sets, collision detection, clustering, or a Canvas
renderer should be designed as separate capabilities rather than added as work
inside every SVG marker.

## Change rules

Before changing a public behavior, answer these questions:

1. Is this geometry/presentation behavior generic, or product policy?
2. Can the core remain React-free?
3. Does it preserve ESM tree shaking and avoid module-level side effects?
4. Does reduced motion change the behavior?
5. Does it work with both an internal and external camera?
6. Does static output need parity?
7. Which public types, examples, docs, and migration guides change?

