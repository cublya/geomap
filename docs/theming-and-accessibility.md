# Theming and accessibility

## Styling model

The visual result is composed from three independent choices:

1. `preset`: `none`, `light`, or `dark`.
2. `palette`: `default` or `minimal`.
3. `countries.outline`: `line`, `gap`, `raised`, `none`, or a detailed outline.

`preset="none"` is the default and is intentionally headless. Use a light or
dark preset for complete token values without importing CSS.

```tsx
<GeoMap
  preset="dark"
  palette="minimal"
  countries={{ data: countries, outline: "gap" }}
/>
```

The resolution order is preset, palette, partial `theme` overrides, layer
callbacks, then direct item properties. A marker's `color`, for example, wins
over `theme.marker`.

## Theme tokens and CSS variables

Built-in token values use CSS variables with fallback colors. Override a token
for one surface through `theme`:

```tsx
<GeoMap
  preset="light"
  theme={{ route: "var(--brand-accent)", marker: "#b91c1c" }}
/>
```

Or override every descendant map through CSS variables on an ancestor:

```css
.travel-map {
  --geomap-land: oklch(0.88 0.03 155);
  --geomap-route: oklch(0.58 0.18 30);
}
```

Use the exported `presets` object and `resolveTheme` when composing theme values
outside a component. Do not mutate preset objects.

## Headless styling

With `preset="none"`, use semantic classes and data attributes:

- `.geomap`, `.geomap-map`, `.geomap-globe`
- `.geomap-country`, `[data-country]`, `[data-selected]`, `[data-disabled]`
- `.geomap-route`, `.geomap-marker`, `.geomap-label`
- `.geomap-live`, `.geomap-trail`, `.geomap-graticule`, `.geomap-sphere`
- `.geomap-controls*`, `.geomap-view-toggle*`, `.geomap-tooltip`
- `[data-geomap-part]`, `[data-geomap-layout]`, `[data-geomap-orientation]`

Controls expose `classNames` slots for utility CSS and `icons` slots for custom
glyphs. The package has no icon-library dependency.

The optional stylesheet:

```ts
import "@cublya/geomap/styles.css";
```

adds namespaced hover, active, and focus-visible polish to optional HTML UI. It
is not required for map geometry or preset colors.

## Country state

Never communicate state by color alone. The country layer supports `hatch` and
`dots` overlays:

```tsx
countries={{
  data: countries,
  fill: countryFill,
  pattern: (country) => wishlist.has(country.id) ? "dots" : undefined,
  disabled: (country) => unavailable.has(country.id),
}}
```

Disabled countries are dimmed and inert: they do not hover, select, or fall
through as ocean clicks. Selection is redrawn as a final outline so adjacent
country paths do not cover it.

## Keyboard and pointer input

Interactive surfaces are focusable images. Default keyboard behavior is:

| Key | Flat map | Globe |
| --- | --- | --- |
| Arrow keys | Pan | Rotate |
| `+` / `=` | Zoom in | Zoom in |
| `-` / `_` | Zoom out | Zoom out |
| `Home` / `0` | Reset | Reset |

Pointer Events unify mouse, touch, and pen. Drag capture begins only after a
small movement threshold so taps can still select countries and markers. Two
pointers pinch-zoom. Wheel zoom is cursor-centred on flat maps.

Set `interactive={false}` for a non-interactive graphic. Set `wheelZoom={false}`
when the map is embedded in a scrolling page and should not consume the wheel.
Set `keyboard={false}` only when equivalent controls exist; it also removes the
surface from the keyboard tab order.

Always provide an application-specific `aria-label`. The defaults describe the
control generically but not the data being communicated.

## Motion

Camera tweens, globe inertia, globe auto-rotation, hover fades, and live-object
interpolation honor `prefers-reduced-motion`. Reduced-motion behavior jumps to
the target or suppresses idle/inertial movement.

Custom layers and application overlays must implement the same policy. Use
`usePrefersReducedMotion` when their motion is driven in React.

## Tooltips

`countries.onHover` returns viewport client coordinates suitable for fixed
positioning. `GeoTooltip` is an optional pointer-anchored helper; applications
remain responsible for tooltip content and localization.

Native SVG `<title>` elements are enabled when no custom hover handler exists.
When `onHover` is provided they default off to prevent duplicate tooltips. This
does not make hover-only content keyboard-accessible: important values should
also exist in surrounding text, a table, a selected-detail panel, or another
keyboard-reachable control.

## Controls and fullscreen

`GeoControls` renders zoom in, zoom out, and reset when given a camera. Passing a
`fullscreen` target adds a Fullscreen API toggle. Fullscreen may be unavailable
or denied by browser policy, so layout must remain usable without it.

Customize visible and accessible labels through `labels`; replacing an icon does
not replace its button label. `GeoViewToggle` is an ARIA radiogroup with map and
globe options rather than an ambiguous single toggle.

## Release accessibility checklist

- Exercise every interactive surface using only the keyboard.
- Verify focus indicators in light, dark, and headless consumer styles.
- Test at 200% browser zoom and in a narrow container.
- Check meaningful information has a non-color representation.
- Confirm auto-rotation and custom animation stop under reduced motion.
- Run Storybook interaction/accessibility tests.
- Manually inspect custom tooltip and selected-detail content with a screen
  reader when the consuming product relies on it.

