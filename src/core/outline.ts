import type { PreparedCountry } from "../types";
import type { ResolvedGeoTheme } from "../theme";

/**
 * How borders are painted, the *behaviour* axis, orthogonal to the colour
 * palette (`preset` × `palette`). Collapses what used to be bundled into
 * the crisp/chalk/relief presets:
 *   • `line`:   a contrast hairline (the classic ink-on-paper divider).
 *   • `gap`:    stroked in the ocean tone so neighbours read as clean gaps
 *                (cut-paper cartography; former `crisp`/`chalk`).
 *   • `raised`: `gap` plus a soft drop shadow that lifts the land off the
 *                ocean (former `relief`).
 *   • `none`:   no stroke.
 */
export const OutlineMode = {
  Line: "line",
  Gap: "gap",
  Raised: "raised",
  None: "none",
} as const;
export type OutlineMode = (typeof OutlineMode)[keyof typeof OutlineMode];

export interface OutlineStyle {
  /** Border behaviour. Default `"line"`. */
  mode?: OutlineMode;
  /** Explicit stroke colour; overrides the tone the mode would derive. */
  color?: string;
  /** Stroke width in viewBox units. Default `0.5`. */
  width?: number;
  /** SVG dash array, e.g. `"4 4"`. */
  dash?: string;
  /** `"raised"` only: drop-shadow strength (scales the offset + blur). Default `1`. */
  elevation?: number;
}

/** A border spec: a bare mode shorthand or a full {@link OutlineStyle}. */
export type Outline = OutlineMode | OutlineStyle;

export interface ResolvedOutline {
  /** Stroke colour, or undefined for no stroke (`none`, or an unstyled theme). */
  color: string | undefined;
  /** Stroke width in viewBox units. */
  width: number;
  /** SVG dash array, or undefined. */
  dash: string | undefined;
  /** Whether a drop shadow should lift the landmass (the `raised` behaviour). */
  raised: boolean;
  /** Drop-shadow strength for the raised behaviour. */
  elevation: number;
}

const DEFAULT_WIDTH = 0.5;

function toStyle(outline: Outline | undefined): OutlineStyle {
  if (outline === undefined) return {};
  return typeof outline === "string" ? { mode: outline } : outline;
}

/**
 * Resolve an {@link Outline} against the active theme into concrete stroke
 * attributes. Deliberately layer-agnostic: countries today; regions, a
 * coastline silhouette, or custom layers can reuse it later. The `mode` picks
 * the tone from theme tokens (`landStroke` / `ocean`); explicit `color` /
 * `width` / `dash` always win.
 */
export function resolveOutline(
  outline: Outline | undefined,
  theme: ResolvedGeoTheme,
): ResolvedOutline {
  const style = toStyle(outline);
  const mode = style.mode ?? OutlineMode.Line;
  const derived =
    mode === OutlineMode.None
      ? undefined
      : mode === OutlineMode.Line
        ? theme.landStroke
        : // `gap` + `raised` both separate neighbours in the ocean tone.
          theme.ocean;
  return {
    color: style.color ?? derived,
    width: style.width ?? DEFAULT_WIDTH,
    dash: style.dash,
    raised: mode === OutlineMode.Raised,
    elevation: style.elevation ?? 1,
  };
}

/** Drop-shadow geometry (in viewBox units) for the raised-land filter. */
export interface LandShadow {
  /** Vertical offset. */
  dy: number;
  /** Gaussian-blur radius. */
  stdDeviation: number;
}

/**
 * Resolve the layer-level "raised" drop shadow that lifts the whole landmass
 * off the ocean (`outline="raised"`). It keys off the *layer* outline (a
 * per-country callback can't drive one group filter) and needs a `landShadow`
 * colour token; returns null when no shadow applies. Both renderers (React
 * `PatternDefs` and the static SVG) build their filter from this, so the
 * geometry can't drift between them.
 */
export function resolveLandShadow(
  outline: Outline | ((country: PreparedCountry) => Outline | undefined) | undefined,
  theme: ResolvedGeoTheme,
): LandShadow | undefined {
  const layerOutline = typeof outline === "function" ? undefined : outline;
  const { raised, elevation } = resolveOutline(layerOutline, theme);
  if (!raised || theme.landShadow === undefined) return undefined;
  return { dy: 0.7 * elevation, stdDeviation: 0.9 * elevation };
}
