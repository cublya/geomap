import type { ResolvedGeoTheme } from "../theme";

/**
 * How borders are painted — the *behaviour* axis, orthogonal to the colour
 * palette (`preset` × `palette`). Collapses what used to be bundled into
 * the crisp/chalk/relief presets:
 *   • `line`   — a contrast hairline (the classic ink-on-paper divider).
 *   • `gap`    — stroked in the ocean tone so neighbours read as clean gaps
 *                (cut-paper cartography; former `crisp`/`chalk`).
 *   • `raised` — `gap` plus a soft drop shadow that lifts the land off the
 *                ocean (former `relief`).
 *   • `none`   — no stroke.
 */
export type OutlineMode = "line" | "gap" | "raised" | "none";

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
  const mode = style.mode ?? "line";
  const derived =
    mode === "none"
      ? undefined
      : mode === "line"
        ? theme.landStroke
        : // `gap` + `raised` both separate neighbours in the ocean tone.
          theme.ocean;
  return {
    color: style.color ?? derived,
    width: style.width ?? DEFAULT_WIDTH,
    dash: style.dash,
    raised: mode === "raised",
    elevation: style.elevation ?? 1,
  };
}
