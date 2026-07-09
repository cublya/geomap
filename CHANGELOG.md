# Changelog

All notable changes to this package are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this package adheres to [Semantic Versioning](https://semver.org/). It is
currently pre-1.0 beta, so the public API may still change.

## [0.0.1-beta-2] - 2026-07-09 (Hikmat Samadov)

### Added

- `GeoControls` buttons now mirror their accessible labels into native browser
  titles, so built-in icon controls expose simple hover/focus tooltip text and
  localized `labels` update both surfaces.

### Changed

- The optional `@cublya/geomap/styles.css` now gives control buttons a pointer
  cursor even when consumers use headless controls plus the optional polish
  stylesheet.

## [0.0.1-beta-1] - 2026-07-09 (Hikmat Samadov)

### Added

- `llms.txt` file summarizing the package's public surface and usage instructions.
- Visual preview images for flat maps, globes, choropleths, patterns, and multi-stop routes.
- `<GeoMap>` (Mercator / Natural Earth / Equal Earth / custom d3 projection) and
  `<GeoGlobe>` (orthographic, drag-rotate with inertia, optional auto-rotate).
- `<GeoView>`: one component that flips between the flat map and the globe via a
  built-in segmented `GeoViewToggle` (top-left) with the zoom cluster
  (bottom-right). Shared data/theming forward to whichever surface is active, the
  two cameras carry the geographic centre (and range-scaled zoom) across the
  switch so flipping stays put, and it runs uncontrolled (`defaultMode`) or
  controlled (`mode` + `onModeChange`). `toggle`/`controls` each take `false` or a
  partial props object to hide/reposition/restyle.
- `<GeoViewToggle>`: a standalone segmented map⇄globe switch (two always-visible
  icon options in one pill, active one highlighted, exposed as an ARIA
  `radiogroup`). Same styling channels as `GeoControls` (preset/theme, `classNames`
  slots, or headless with `data-geomap-active` hooks) and an `icons` slot.
- `prepareCountries()`: TopoJSON/GeoJSON preprocessing with full ISO 3166-1
  identity (alpha-2/alpha-3/numeric/name lookup) and Natural Earth name
  reconciliation.
- Country choropleth fills, hatch/dot state patterns, selection, hover
  reporting, `disabled` countries.
- Animated hover highlight: the `landHover` overlay fades in and out, tunable via
  `countries.hover` (`{ durationMs, easing }` or `false` for an instant snap) and
  automatically honouring `prefers-reduced-motion`. Interactive countries also
  show a `pointer` hover cursor (instead of the map's grab hand), including
  hover-only maps.
- Generic markers (city/airport/point) with counter-scaling and custom
  renderers; multi-stop great-circle routes.
- Live objects: heading-rotated glyphs tweened between position updates on a
  shared rAF loop, with optional trails.
- Overlay legibility: markers, live glyphs, labels, and trails now paint a
  contrast casing (new `halo` theme token) behind themselves so they stay
  readable over any basemap tone (e.g. the light preset's dark inked land,
  where an un-cased glyph/label would otherwise vanish). Emitted only for styled
  presets; `preset="none"` stays casing-free.
- Cameras (`useMapCamera` / `useGlobeCamera` + framework-free stores): pan,
  zoom, fly-to, focus, fit-to (world/coords/bounds/country), reset, inertia.
- Pointer (mouse/touch/pen) gestures with deferred capture, wheel + pinch zoom,
  keyboard controls, `prefers-reduced-motion` support, themed focus indicators.
- Custom SVG layers via `useGeo()`; static `renderStaticMapSvg()` +
  `svgToPngBlob()` share images; server-safe imports (usable in React Server
  Components).
- Built-in visual presets: complete looks with zero CSS imports, via SVG
  attributes and theme objects. Three orthogonal axes: `preset` picks the colour
  mode (`light` / `dark` / `none`), `palette` picks the fill palette
  (`filled` filled / `minimal` line-art), and `countries.outline` picks the
  border behaviour independently: `line` (hairline), `gap` (ocean-tone gaps so
  choropleth fills carry the map), `raised` (`gap` + a soft drop shadow lifting
  the land) or `none`. `outline` also accepts a full `{ mode, color, width, dash,
  elevation }` style or a `(country) => Outline` callback for per-feature
  borders. Palette × outline reproduces the classic cut-paper (`filled` + `gap`)
  and raised-relief (`filled` + `raised`) looks without a preset per combination.
  Every combo works in light and dark; `none` (**the default**) stays fully
  unstyled. OKLCH neutral palettes, AA contrast, no raw `#fff`/`#000`, no branding.
- `resolveOutline()` + `Outline` / `OutlineStyle` / `OutlineMode` /
  `ResolvedOutline` types: a layer-agnostic border resolver reused across the
  interactive and static renderers (and ready for future region/coastline
  layers). A `PreparedFeature` base underneath `PreparedCountry` keeps layers
  and callbacks reusable beyond countries.
- `preset` + `palette` props + `theme` partial token overrides + exported
  `presets` objects for composition (indexed by mode then palette, e.g.
  `presets.dark.minimal`) + `--geomap-*` CSS variables for global overrides +
  semantic `geomap-*` class names (with `data-country` / `data-selected` /
  `data-disabled`), always present regardless of preset. The same resolved
  theme flows to `GeoControls` and `GeoTooltip`, so every surface matches.
- Optional `GeoControls` and `GeoTooltip` HTML helpers, also defaulting to
  `preset="none"`; pass a preset for a complete out-of-the-box look. The
  optional `@cublya/geomap/styles.css` adds only pseudo-class polish for them
  (namespaced, cannot leak).
- `GeoTooltip` optional leading country flag, icon-library-agnostic (no hard
  dependency): `flag` (alpha-2 code, e.g. `hover.country.id`) with `flagStyle`:
  `none` (default) / `emoji` (zero-dependency regional-indicator glyphs) /
  `icon` (a `<span>` class for CSS icon fonts like flag-icons or circle-flags,
  customizable via `flagClassName`) / `image` (an opt-in `<img>` whose src is
  flagcdn.com by default, customizable via `flagSrc`). A `renderFlag` slot drops
  in React flag-component libraries or anything else. Exported `flagEmoji()`
  helper converts an alpha-2 code to its emoji.
- `GeoControls` per-part `classNames` slots (`root`/`button`/`zoomIn`/`zoomOut`/
  `reset`/`fullscreen`), an `orientation` prop, a `layout` prop (`separate` tiles
  / `segmented` pill), an optional `fullscreen` prop (pass the element/ref to
  toggle via the Fullscreen API; adds a trailing toggle button that reflects
  state on `aria-pressed` / `data-geomap-fullscreen`), and an `icons` slot to
  swap any built-in glyph for your own node (icon-library component, `<img>`,
  emoji; the package ships zero icon dependencies);
  `GeoControls`/`GeoTooltip` carry `data-geomap-part`
  (+ `data-geomap-orientation` / `data-geomap-layout`) hooks. With
  `preset="none"` no inline styles are emitted, so Tailwind/raw CSS own the
  look outright.
- Vitest unit suite; Storybook (React + Vite) demo/docs site with interaction +
  axe accessibility tests; Playwright screenshot tests; publint; Vite and
  Next.js fixture apps built from the packed tarball; GitHub Pages deploy of
  Storybook from `main`.

### Changed

- Renamed the preset palette variant `default` to `filled` to avoid clash with default prop values.
- Custom branding theme for Storybook using the brand colors and logos.
- Renamed the package from `@cublya/geo` to `@cublya/geomap` (CSS/class prefix
  `geo-*` → `geomap-*`, CSS variables `--geo-*` → `--geomap-*`) for a more
  literal, obvious name.
- `GeoControls` now renders crisp inline SVG icons (instead of loose text-glyph
  buttons) as `separate`, individually rounded and shadowed tiles by default,
  each carrying its own preset surface, with `layout="segmented"` to join them
  into a single hairline-divider pill. `GeoTooltip` gained an inline shadow so
  its styled preset looks complete without the CSS file.
- `GeoTooltip`'s styled preset now renders a downward caret that anchors the
  surface to the cursor, plus tightened padding, radius, and shadow. The
  Choropleth "Tooltip" story matches the map preset and shows a compact
  single-line card (flag, country name, and a colour-coded score chip (bin fill
  with contrast-picked ink and an inset ring)) instead of an unstyled line.
- `countries.nativeTitle` toggles the per-country native SVG `<title>` (the
  browser's built-in hover tooltip). It defaults to `false` when `onHover` is set
  so the browser tooltip no longer doubles up with a custom `GeoTooltip`, and
  `true` otherwise; pass it explicitly to override.
- README Quickstart now imports `world-atlas/countries-10m.json` instead of
  `countries-110m.json`; `10m` is the only bundled resolution with full coverage of all
  193 UN members and both observer states (`110m` silently drops 28 members and
  the Holy See; `50m` drops Tuvalu). See
  [docs/basemap-coverage.md](docs/basemap-coverage.md) (added, last verified
  2026-07-08 against `world-atlas@2.0.2`) for the full per-resolution matrix
  and a re-verification script.
