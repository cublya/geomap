# Troubleshooting

## The map is blank or has zero height

The SVG uses `width: 100%` and `height: 100%`. Give its container an explicit or
otherwise resolved height:

```css
.map-frame { min-height: 420px; }
```

Also verify that `countries.data.countries` is non-empty and that the chosen
projection can render the supplied coordinates.

## Countries render with no colors

The default is `preset="none"`, which deliberately emits no complete visual
theme. Pass `preset="light"` or `preset="dark"`, provide theme/fill values, or
style semantic classes yourself.

When a `fill` callback returns `undefined`, a styled preset uses `landMuted`.
With a headless theme, that token can also be undefined.

## A country lookup fails

Inspect the prepared feature first:

```ts
console.log(countries.get("name-or-code"));
```

Common causes are a misspelled country name, a source feature without usable
identity properties, disputed territory represented as part of another feature,
or a low-resolution atlas that omits a small state. Prefer ISO codes over display
names and consult [Basemap coverage](basemap-coverage.md).

## Markers appear in the wrong place

Tuple coordinates are `[longitude, latitude]`, not `[latitude, longitude]`.
Use `{ lat, lng }` objects at data ingestion boundaries when tuple order is easy
to confuse.

On a globe, `project` returns `null` for hidden-hemisphere points. Custom layers
using the raw d3 projection can accidentally render backface objects; use the
context `project` helper.

## Fit or pan does not work with a custom projection

Flat camera operations need an invertible d3 projection. Ensure the custom
projection exposes `invert`, is configured for the supplied viewBox, and returns
finite points. Call `fitTo` after the camera is attached to `GeoMap`; the built-in
store queues early fits, but a custom camera implementation must preserve that
contract.

## The declarative `fit` does not rerun

`fit` reruns when its semantic key changes. Reusing the same country or the same
serialized coordinate values does not request another animation. Use the camera's
imperative `fitTo` method when a user action must repeat the same framing.

For `GeoGlobe`, `fit="world"` resets the camera. For coordinate or country fits,
the globe frames a spherical cap; wide or antimeridian-spanning sets can produce
a different result from a flat bounding box.

## Page scrolling is blocked over the map

Interactive surfaces set `touch-action: none`, and wheel zoom is on by default.
Set `wheelZoom={false}` to keep mouse-wheel page scrolling. If all gestures should
belong to the page, set `interactive={false}`.

## A country click clears selection unexpectedly

The surface reports `onSelect(null)` for an ocean/background click. Country and
marker handlers stop propagation unless the gesture was a drag. Check custom SVG
children: clicks from a custom child can bubble to the surface and look like an
ocean click unless the child stops propagation intentionally.

## Two tooltips appear

Native `<title>` elements and a custom hover tooltip are both active. The default
turns native titles off when `onHover` exists, but an explicit
`nativeTitle: true` overrides it. Remove that override or do not render the custom
tooltip.

## Controls have no hover or focus polish

Preset colors are inline and need no stylesheet. Pseudo-class effects for the
optional HTML controls are in:

```ts
import "@cublya/geomap/styles.css";
```

In headless mode, supply your own CSS or `classNames` slots. Check that a consumer
build is allowed to import the package's exported CSS subpath.

## Globe motion continues or feels excessive

Set `inertia={false}` to disable post-drag spin and omit `autoRotate` to disable
idle motion. Both are suppressed when the operating system requests reduced
motion. If custom application animation continues, it must implement reduced
motion independently.

## PNG conversion fails on the server

`svgToPngBlob` requires browser `document`, `Image`, canvas, and `Blob` APIs. Use
`renderStaticMapSvg` on the server and return SVG directly, or rasterize it with a
server-side image library owned by the application.

If browser conversion returns a null blob or image-load error, check for invalid
external resources, unsupported SVG features, and canvas restrictions. The
built-in renderer emits self-contained paths and text.

## Next.js reports a client/server boundary error

Place interactive surfaces and camera hooks in a file with `"use client"`.
Keep server components responsible for fetching and serializable data. Static SVG
rendering can remain server-side, but do not call `svgToPngBlob` there.

## A package build works locally but fails when installed

Source aliases can hide packaging errors. Run:

```sh
npm run build
npx publint
npm pack --dry-run
bash scripts/verify-fixtures.sh
```

Confirm the package contains `dist/index.js`, `dist/index.d.ts`, and
`dist/styles.css`, and that only documented export subpaths are imported.

## Visual snapshots fail unexpectedly

First build the current Storybook and inspect the diff. Determine whether it is a
real rendering change or platform rasterization noise. Do not update snapshots to
make CI green without reviewing the images. See [Testing and releases](testing-and-releases.md)
for the baseline workflow.

## Reporting an issue

Include:

- package, React, browser, and framework versions;
- the surface and projection in use;
- a minimal geometry/data sample or atlas resolution;
- whether the issue reproduces with a built-in preset and camera;
- expected and actual behavior;
- console errors and, for visual problems, a screenshot;
- reduced-motion and input method details for interaction defects.

