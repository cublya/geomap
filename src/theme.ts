/**
 * Visual presets and theme tokens.
 *
 * Components look complete by default with zero CSS imports — presentation is
 * driven entirely by SVG attributes and inline props resolved from these
 * tokens. Style precedence (lowest → highest):
 *
 *   1. package defaults        — the `none` preset (fully unstyled)
 *   2. selected preset         — `preset="light" | "dark" | "minimal"`
 *   3. theme overrides         — `theme={{ land: "…" }}` (partial tokens)
 *   4. per-feature callbacks   — `countries.fill/pattern/disabled`, `renderMarker`, …
 *   5. direct element props    — `marker.color`, `route.color`, `countries.stroke`, …
 *
 * The default preset is `none`: components emit no presentation attributes and
 * render exactly what you tell them to (plus the semantic `geomap-*` class names
 * for CSS-driven styling). Pass `preset="light"` (or `"dark"` / `"minimal"`) to
 * opt into a complete out-of-the-box look — every value in those presets is a
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
  /** Outline of the selected country. */
  selectedStroke: string;
  graticule: string;
  /** Globe outline. */
  sphere: string;
  marker: string;
  markerLabel: string;
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

export type GeoPresetName = "light" | "dark" | "minimal" | "none";

const CSS_VAR_NAMES: Record<keyof GeoTheme, string> = {
  ocean: "ocean",
  land: "land",
  landMuted: "land-muted",
  landDisabled: "land-disabled",
  landHover: "land-hover",
  landStroke: "land-stroke",
  selectedStroke: "selected-stroke",
  graticule: "graticule",
  sphere: "sphere",
  marker: "marker",
  markerLabel: "marker-label",
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

/** Warm-neutral surfaces, near-black ink, standard accessible focus blue. */
const light: GeoTheme = withVars({
  ocean: "oklch(0.975 0.003 90)",
  land: "oklch(0.88 0.006 90)",
  landMuted: "oklch(0.925 0.003 90)",
  landDisabled: "oklch(0.945 0.002 90)",
  landHover: "oklch(0.25 0.01 90 / 0.1)",
  landStroke: "oklch(0.25 0.01 90 / 0.2)",
  selectedStroke: "oklch(0.3 0.01 90)",
  graticule: "oklch(0.25 0.01 90 / 0.08)",
  sphere: "oklch(0.25 0.01 90 / 0.25)",
  marker: "oklch(0.35 0.015 260)",
  markerLabel: "oklch(0.3 0.01 90)",
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
});

/** Cool-neutral dark surfaces, near-white ink. */
const dark: GeoTheme = withVars({
  ocean: "oklch(0.21 0.008 250)",
  land: "oklch(0.33 0.008 250)",
  landMuted: "oklch(0.27 0.006 250)",
  landDisabled: "oklch(0.25 0.005 250)",
  landHover: "oklch(0.95 0.01 90 / 0.12)",
  landStroke: "oklch(0.95 0.01 90 / 0.16)",
  selectedStroke: "oklch(0.93 0.01 90)",
  graticule: "oklch(0.95 0.01 90 / 0.08)",
  sphere: "oklch(0.95 0.01 90 / 0.22)",
  marker: "oklch(0.87 0.02 260)",
  markerLabel: "oklch(0.93 0.005 90)",
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
});

/** Hue-less line-art look: transparent ocean, faint fills, ink strokes. */
const minimal: GeoTheme = withVars({
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
  focus: "oklch(0.55 0.17 255)",
  controlBg: "oklch(0.99 0 0)",
  controlInk: "oklch(0.25 0 0)",
  controlBorder: "oklch(0.2 0 0 / 0.25)",
  tooltipBg: "oklch(0.99 0 0)",
  tooltipInk: "oklch(0.25 0 0)",
  tooltipBorder: "oklch(0.2 0 0 / 0.2)",
});

/** Explicitly unstyled: no presentation attributes; your CSS owns everything. */
const none: ResolvedGeoTheme = {};

/** Preset objects, exported for composition (`{ ...presets.dark, route: "…" }`). */
export const presets: Record<GeoPresetName, ResolvedGeoTheme> = {
  light,
  dark,
  minimal,
  none,
};

/** Apply the precedence chain steps 1–3: defaults (none) → preset → theme overrides. */
export function resolveTheme(
  preset: GeoPresetName = "none",
  overrides?: Partial<GeoTheme>,
): ResolvedGeoTheme {
  const base = presets[preset];
  return overrides ? { ...base, ...overrides } : base;
}

/** Join class names, skipping falsy values. */
export function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(" ");
}
