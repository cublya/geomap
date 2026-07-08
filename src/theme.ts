/**
 * Visual presets and theme tokens.
 *
 * Components look complete by default with zero CSS imports — presentation is
 * driven entirely by SVG attributes and inline props resolved from these
 * tokens. Style precedence (lowest → highest):
 *
 *   1. package defaults        — the `none` preset (fully unstyled)
 *   2. selected preset         — `preset="light" | "dark"` × `palette`
 *   3. theme overrides         — `theme={{ land: "…" }}` (partial tokens)
 *   4. per-feature callbacks   — `countries.fill/pattern/disabled/outline`, `renderMarker`, …
 *   5. direct element props    — `marker.color`, `route.color`, `countries.outline`, …
 *
 * The default preset is `none`: components emit no presentation attributes and
 * render exactly what you tell them to (plus the semantic `geomap-*` class names
 * for CSS-driven styling). Pass `preset="light"` (or `"dark"`) to opt into a
 * complete out-of-the-box look — every value in those presets is a
 * `var(--geomap-<token>, <fallback>)` expression, so consumers can also override
 * globally with CSS variables instead of props.
 *
 * Palettes use OKLCH neutrals (no raw #fff/#000) with AA-contrast ink/surface
 * pairs, and are deliberately generic: no brand colors, no product semantics.
 */
export interface GeoTheme {
  /** Map background (flat) / sphere fill (globe). */
  ocean: string;
  /** Default country fill. */
  land: string;
  /** Countries whose `fill` callback returned undefined ("no data"). */
  landMuted: string;
  /** Countries the `disabled` callback marked inert. */
  landDisabled: string;
  /** Overlay painted on the hovered country (use a translucent color). */
  landHover: string;
  /** Country borders. */
  landStroke: string;
  /** Drop-shadow colour for raised land (`outline="raised"`). */
  landShadow: string;
  /** Outline of the selected country. */
  selectedStroke: string;
  graticule: string;
  /** Globe outline. */
  sphere: string;
  marker: string;
  markerLabel: string;
  /**
   * Contrast casing painted behind overlay glyphs, labels, and trails so they
   * stay legible on any basemap tone (e.g. dark inked land on the light preset).
   */
  halo: string;
  route: string;
  /** Live (moving) object glyphs. */
  live: string;
  /** Trails behind live objects. */
  trail: string;
  /** Stroke/fill of the hatch and dot state patterns. */
  patternInk: string;
  /** Keyboard focus indicator on the map itself. */
  focus: string;
  controlBg: string;
  controlInk: string;
  controlBorder: string;
  tooltipBg: string;
  tooltipInk: string;
  tooltipBorder: string;
}

/** A theme after preset resolution; `undefined` values emit no attribute. */
export type ResolvedGeoTheme = { readonly [K in keyof GeoTheme]?: string | undefined };

/**
 * Colour mode. Theming is three orthogonal axes: `preset` picks the mode,
 * `palette` (below) picks the fill palette, and `countries.outline` picks the
 * border behaviour. `"none"` opts out entirely.
 */
export type GeoPreset = "light" | "dark" | "none";

/**
 * Fill palette, applied on top of the mode:
 *   • `default` — the plain filled look (ink-on-paper landmasses).
 *   • `minimal` — hue-less line-art: transparent ocean, faint fills.
 *
 * Border *behaviour* is a separate, orthogonal axis — see the `outline` prop
 * (`"line" | "gap" | "raised" | "none"`). Together they reproduce the old
 * bundled presets without the combinatorial explosion:
 *   crisp  = `default` + `outline="gap"`
 *   chalk  = `minimal` + `outline="gap"`
 *   relief = `default` + `outline="raised"`
 */
export type GeoPalette = "default" | "minimal";

const CSS_VAR_NAMES: Record<keyof GeoTheme, string> = {
  ocean: "ocean",
  land: "land",
  landMuted: "land-muted",
  landDisabled: "land-disabled",
  landHover: "land-hover",
  landStroke: "land-stroke",
  landShadow: "land-shadow",
  selectedStroke: "selected-stroke",
  graticule: "graticule",
  sphere: "sphere",
  marker: "marker",
  markerLabel: "marker-label",
  halo: "halo",
  route: "route",
  live: "live",
  trail: "trail",
  patternInk: "pattern-ink",
  focus: "focus",
  controlBg: "control-bg",
  controlInk: "control-ink",
  controlBorder: "control-border",
  tooltipBg: "tooltip-bg",
  tooltipInk: "tooltip-ink",
  tooltipBorder: "tooltip-border",
};

function withVars(fallbacks: Record<keyof GeoTheme, string>): GeoTheme {
  const theme = {} as Record<keyof GeoTheme, string>;
  for (const key of Object.keys(CSS_VAR_NAMES) as (keyof GeoTheme)[]) {
    theme[key] = `var(--geomap-${CSS_VAR_NAMES[key]}, ${fallbacks[key]})`;
  }
  return theme;
}

type Fallbacks = Record<keyof GeoTheme, string>;

// ── Mode bases (the `default` variant) ────────────────────────────────────────

/**
 * Warm paper surface with near-black "ink" landmasses. The ocean matches a
 * neutral page background so the flat map / globe disc reads as one surface
 * (no visible seam); countries are separated by paper-colored hairlines — the
 * classic ink-on-paper cartographic look. `landMuted` (no data) stays a pale
 * grey so absent-data countries read as empty against the inked ones.
 */
const lightBase: Fallbacks = {
  ocean: "oklch(0.97 0.006 90)",
  land: "oklch(0.32 0.012 90)",
  landMuted: "oklch(0.86 0.006 90)",
  landDisabled: "oklch(0.91 0.004 90)",
  landHover: "oklch(0.99 0.02 90 / 0.18)",
  landStroke: "oklch(0.97 0.006 90 / 0.7)",
  landShadow: "oklch(0.2 0.01 90 / 0.28)",
  selectedStroke: "oklch(0.22 0.01 90)",
  graticule: "oklch(0.3 0.01 90 / 0.09)",
  sphere: "oklch(0.3 0.01 90 / 0.22)",
  marker: "oklch(0.35 0.015 260)",
  markerLabel: "oklch(0.3 0.01 90)",
  halo: "oklch(0.98 0.006 90 / 0.9)",
  route: "oklch(0.4 0.02 260)",
  live: "oklch(0.4 0.02 260)",
  trail: "oklch(0.4 0.02 260 / 0.45)",
  patternInk: "oklch(0.25 0.01 90 / 0.55)",
  focus: "oklch(0.55 0.17 255)",
  controlBg: "oklch(0.985 0.002 90)",
  controlInk: "oklch(0.3 0.01 90)",
  controlBorder: "oklch(0.25 0.01 90 / 0.2)",
  tooltipBg: "oklch(0.985 0.002 90)",
  tooltipInk: "oklch(0.3 0.01 90)",
  tooltipBorder: "oklch(0.25 0.01 90 / 0.16)",
};

/**
 * Cool-neutral dark surface with whiteish landmasses — the light preset
 * inverted. Ocean-dark hairlines separate the light countries; `landMuted`
 * (no data) is a dim grey so absent-data reads as empty against the lit land.
 */
const darkBase: Fallbacks = {
  ocean: "oklch(0.21 0.008 250)",
  land: "oklch(0.9 0.008 250)",
  landMuted: "oklch(0.4 0.008 250)",
  landDisabled: "oklch(0.3 0.006 250)",
  landHover: "oklch(0.2 0.02 250 / 0.18)",
  landStroke: "oklch(0.21 0.008 250 / 0.7)",
  landShadow: "oklch(0.08 0.008 250 / 0.55)",
  selectedStroke: "oklch(0.25 0.01 250)",
  graticule: "oklch(0.95 0.01 90 / 0.08)",
  sphere: "oklch(0.95 0.01 90 / 0.22)",
  marker: "oklch(0.87 0.02 260)",
  markerLabel: "oklch(0.93 0.005 90)",
  halo: "oklch(0.16 0.008 250 / 0.85)",
  route: "oklch(0.83 0.03 260)",
  live: "oklch(0.83 0.03 260)",
  trail: "oklch(0.83 0.03 260 / 0.45)",
  patternInk: "oklch(0.95 0.01 90 / 0.5)",
  focus: "oklch(0.72 0.15 255)",
  controlBg: "oklch(0.27 0.008 250)",
  controlInk: "oklch(0.93 0.005 90)",
  controlBorder: "oklch(0.95 0.01 90 / 0.18)",
  tooltipBg: "oklch(0.27 0.008 250)",
  tooltipInk: "oklch(0.93 0.005 90)",
  tooltipBorder: "oklch(0.95 0.01 90 / 0.16)",
};

// ── Variant overlays ──────────────────────────────────────────────────────────
// Each variant spreads its mode base and overrides only the tokens that define
// the look, so every combination keeps the exact same token set.

/** Hue-less line-art: transparent ocean, faint fills, ink strokes. */
const lightMinimal: Fallbacks = {
  ...lightBase,
  ocean: "transparent",
  land: "oklch(0.955 0 0)",
  landMuted: "oklch(0.97 0 0)",
  landDisabled: "oklch(0.975 0 0)",
  landHover: "oklch(0.2 0 0 / 0.06)",
  landStroke: "oklch(0.2 0 0 / 0.35)",
  selectedStroke: "oklch(0.2 0 0)",
  graticule: "oklch(0.2 0 0 / 0.06)",
  sphere: "oklch(0.2 0 0 / 0.3)",
  marker: "oklch(0.25 0 0)",
  markerLabel: "oklch(0.25 0 0)",
  route: "oklch(0.25 0 0)",
  live: "oklch(0.25 0 0)",
  trail: "oklch(0.25 0 0 / 0.4)",
  patternInk: "oklch(0.2 0 0 / 0.5)",
  controlBg: "oklch(0.99 0 0)",
  controlInk: "oklch(0.25 0 0)",
  controlBorder: "oklch(0.2 0 0 / 0.25)",
  tooltipBg: "oklch(0.99 0 0)",
  tooltipInk: "oklch(0.25 0 0)",
  tooltipBorder: "oklch(0.2 0 0 / 0.2)",
};

/** Dark line-art: transparent ocean, dark fills, light ink strokes. */
const darkMinimal: Fallbacks = {
  ...darkBase,
  ocean: "transparent",
  land: "oklch(0.28 0 0)",
  landMuted: "oklch(0.24 0 0)",
  landDisabled: "oklch(0.22 0 0)",
  landHover: "oklch(0.95 0 0 / 0.08)",
  landStroke: "oklch(0.95 0 0 / 0.3)",
  selectedStroke: "oklch(0.95 0 0)",
  graticule: "oklch(0.95 0 0 / 0.06)",
  sphere: "oklch(0.95 0 0 / 0.25)",
  marker: "oklch(0.9 0 0)",
  markerLabel: "oklch(0.9 0 0)",
  route: "oklch(0.9 0 0)",
  live: "oklch(0.9 0 0)",
  trail: "oklch(0.9 0 0 / 0.4)",
  patternInk: "oklch(0.9 0 0 / 0.5)",
  controlBg: "oklch(0.22 0 0)",
  controlInk: "oklch(0.9 0 0)",
  controlBorder: "oklch(0.95 0 0 / 0.22)",
  tooltipBg: "oklch(0.22 0 0)",
  tooltipInk: "oklch(0.9 0 0)",
  tooltipBorder: "oklch(0.95 0 0 / 0.2)",
};

/** The full mode × palette matrix, every token wrapped in a `--geomap-*` var. */
const styledPresets: Record<
  Exclude<GeoPreset, "none">,
  Record<GeoPalette, GeoTheme>
> = {
  light: {
    default: withVars(lightBase),
    minimal: withVars(lightMinimal),
  },
  dark: {
    default: withVars(darkBase),
    minimal: withVars(darkMinimal),
  },
};

/** Explicitly unstyled: no presentation attributes; your CSS owns everything. */
const none: ResolvedGeoTheme = {};

/**
 * Resolved preset objects, exported for composition — index by mode then
 * variant (`{ ...presets.dark.minimal, route: "…" }`); `presets.none` is empty.
 */
export const presets: {
  light: Record<GeoPalette, GeoTheme>;
  dark: Record<GeoPalette, GeoTheme>;
  none: ResolvedGeoTheme;
} = { ...styledPresets, none };

/**
 * Apply the precedence chain steps 1–3: defaults (none) → preset+palette →
 * theme overrides. Resolve this once and pass the result down; every surface
 * (map, globe, controls, tooltip, static render) then reads the same tokens.
 */
export function resolveTheme(
  preset: GeoPreset = "none",
  palette: GeoPalette = "default",
  overrides?: Partial<GeoTheme>,
): ResolvedGeoTheme {
  const base = preset === "none" ? none : styledPresets[preset][palette];
  return overrides ? { ...base, ...overrides } : base;
}

/** Join class names, skipping falsy values. */
export function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(" ");
}
