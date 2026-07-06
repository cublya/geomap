/**
 * Every value is a CSS color string — raw values or `var(--token)` both work, so
 * CSS-variable/Tailwind apps keep their design tokens while static export passes
 * concrete colors.
 */
export interface GeoTheme {
  ocean: string;
  land: string;
  landStroke: string;
  /** Countries whose `fill` callback returned undefined but that are still identifiable. */
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

export const defaultTheme: GeoTheme = {
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
};

export const darkTheme: GeoTheme = {
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
};

export function mergeTheme(overrides?: Partial<GeoTheme>, base: GeoTheme = defaultTheme): GeoTheme {
  return overrides ? { ...base, ...overrides } : base;
}
