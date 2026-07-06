/**
 * Theming works without any CSS import. Every built-in theme value is a
 * `var(--cublya-geo-*, fallback)` expression, so hosts can restyle globally by
 * defining the CSS variables, per-instance via the `theme` prop, or not at all
 * (the fallbacks paint a complete light/dark map).
 *
 * Modes:
 * - `"light"` (default) / `"dark"` — complete palettes with CSS-variable hooks.
 * - `Partial<GeoTheme>`             — custom: merged over the light palette.
 * - `"unstyled"`                    — no presentation attributes are emitted;
 *   style the stable `cublya-geo-*` class names from your own CSS.
 */
export interface GeoTheme {
  ocean: string;
  land: string;
  landStroke: string;
  /** Countries whose `fill` callback returned undefined ("no data"). */
  landMuted: string;
  selectedStroke: string;
  graticule: string;
  sphere: string;
  marker: string;
  markerLabel: string;
  route: string;
  live: string;
  trail: string;
  /** Stroke/fill used by the hatch and dot state patterns. */
  patternInk: string;
}

/** A theme after mode resolution; `undefined` values emit no attribute. */
export type ResolvedGeoTheme = { readonly [K in keyof GeoTheme]?: string | undefined };

export type GeoThemeMode = "light" | "dark" | "unstyled";
export type GeoThemeInput = GeoThemeMode | Partial<GeoTheme>;

const CSS_VAR_NAMES: Record<keyof GeoTheme, string> = {
  ocean: "ocean",
  land: "land",
  landStroke: "land-stroke",
  landMuted: "land-muted",
  selectedStroke: "selected-stroke",
  graticule: "graticule",
  sphere: "sphere",
  marker: "marker",
  markerLabel: "marker-label",
  route: "route",
  live: "live",
  trail: "trail",
  patternInk: "pattern-ink",
};

function withVars(fallbacks: Record<keyof GeoTheme, string>): GeoTheme {
  const theme = {} as Record<keyof GeoTheme, string>;
  for (const key of Object.keys(CSS_VAR_NAMES) as (keyof GeoTheme)[]) {
    theme[key] = `var(--cublya-geo-${CSS_VAR_NAMES[key]}, ${fallbacks[key]})`;
  }
  return theme;
}

export const lightTheme: GeoTheme = withVars({
  ocean: "transparent",
  land: "#d8d4cb",
  landStroke: "rgba(19, 21, 21, 0.18)",
  landMuted: "#e4e1da",
  selectedStroke: "#131515",
  graticule: "rgba(19, 21, 21, 0.08)",
  sphere: "rgba(19, 21, 21, 0.18)",
  marker: "#131515",
  markerLabel: "#131515",
  route: "#131515",
  live: "#131515",
  trail: "rgba(19, 21, 21, 0.35)",
  patternInk: "rgba(19, 21, 21, 0.5)",
});

export const darkTheme: GeoTheme = withVars({
  ocean: "transparent",
  land: "#33383b",
  landStroke: "rgba(255, 255, 255, 0.16)",
  landMuted: "#282c2e",
  selectedStroke: "#f5f3ef",
  graticule: "rgba(255, 255, 255, 0.07)",
  sphere: "rgba(255, 255, 255, 0.16)",
  marker: "#f5f3ef",
  markerLabel: "#f5f3ef",
  route: "#f5f3ef",
  live: "#f5f3ef",
  trail: "rgba(255, 255, 255, 0.35)",
  patternInk: "rgba(255, 255, 255, 0.5)",
});

/** @deprecated Alias of {@link lightTheme}; kept for 0.1.x compatibility. */
export const defaultTheme: GeoTheme = lightTheme;

/** Emits no presentation attributes — style `cublya-geo-*` classes yourself. */
export const unstyledTheme: ResolvedGeoTheme = {};

export function resolveTheme(input?: GeoThemeInput | null): ResolvedGeoTheme {
  if (input == null || input === "light") return lightTheme;
  if (input === "dark") return darkTheme;
  if (input === "unstyled") return unstyledTheme;
  return { ...lightTheme, ...input };
}

/** @deprecated Use {@link resolveTheme}. */
export function mergeTheme(overrides?: Partial<GeoTheme>, base: GeoTheme = lightTheme): GeoTheme {
  return overrides ? { ...base, ...overrides } : base;
}

/** Join class names, skipping falsy values. */
export function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(" ");
}
