import * as React from "react";
import {
  resolveTheme,
  GeoPreset,
  type GeoPalette,
  type GeoTheme,
  type ResolvedGeoTheme,
} from "../theme";

export interface ControlSurface {
  /** Resolved theme tokens for the current preset/palette/overrides. */
  t: ResolvedGeoTheme;
  /**
   * Whether the component owns its surface via inline preset styles. False on
   * the headless `preset="none"` path with no token overrides, where the
   * caller's own CSS/classNames drive the look.
   */
  styled: boolean;
}

/**
 * Shared preset wiring for the overlay chrome (controls, view toggle, tooltip):
 * resolve the theme once and decide whether inline preset styling applies.
 */
export function useControlSurface(
  preset: GeoPreset,
  palette: GeoPalette,
  theme: Partial<GeoTheme> | undefined,
): ControlSurface {
  const t = React.useMemo(
    () => resolveTheme(preset, palette, theme),
    [preset, palette, theme],
  );
  return { t, styled: preset !== GeoPreset.None || theme !== undefined };
}
