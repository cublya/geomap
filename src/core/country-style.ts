import type { CountryPattern } from "../types";
import type { CountriesLayerProps, PreparedCountry } from "../types";
import type { ResolvedGeoTheme } from "../theme";
import { resolveOutline, type Outline, type ResolvedOutline } from "./outline";

/**
 * The per-country styling inputs shared by every renderer. A subset of
 * {@link CountriesLayerProps} so the SVG layer, canvas renderer, and static SVG
 * export all resolve fill/outline/pattern the same way and can't drift apart.
 */
type CountryStyleInput = Pick<
  CountriesLayerProps,
  "fill" | "outline" | "disabled" | "pattern"
>;

export interface CountryStyle {
  isDisabled: boolean;
  /** Resolved fill, or undefined when the theme carries no land tone. */
  fill: string | undefined;
  outline: ResolvedOutline;
  /** Pattern to overlay on the fill, or undefined (also undefined when disabled). */
  pattern: CountryPattern | undefined;
}

/**
 * Resolve a country's fill, outline, disabled state, and pattern against the
 * active theme. The single source of truth for the styling precedence (disabled
 * dims and drops patterns; a `fill` callback returning undefined falls back to
 * the muted tone; the layer/per-country outline resolves via
 * {@link resolveOutline}).
 */
export function resolveCountryStyle(
  country: PreparedCountry,
  { fill, outline, disabled, pattern }: CountryStyleInput,
  theme: ResolvedGeoTheme,
): CountryStyle {
  const isDisabled = disabled?.(country) ?? false;
  return {
    isDisabled,
    fill: isDisabled
      ? theme.landDisabled
      : fill
        ? (fill(country) ?? theme.landMuted)
        : theme.land,
    outline: resolveOutline(
      typeof outline === "function" ? outline(country) : outline,
      theme,
    ),
    pattern: isDisabled ? undefined : pattern?.(country),
  };
}

/** Resolve the selected-country outline, defaulting to the theme's selection tone. */
export function resolveSelectedOutline(
  selectedOutline: Outline | undefined,
  theme: ResolvedGeoTheme,
): ResolvedOutline {
  return resolveOutline(
    selectedOutline ?? { color: theme.selectedStroke, width: 1.2 },
    theme,
  );
}
