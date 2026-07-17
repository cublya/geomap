/**
 * Default draw attributes for the marker/route/label overlays, shared by the
 * React layers and the static SVG renderer so exports match the on-screen look
 * and can't silently drift apart.
 */

export const ROUTE_DEFAULTS = {
  /** Stroke width in viewBox units. */
  width: 1.4,
  /** Stroke opacity. */
  opacity: 0.9,
  /** Dash pattern applied when `route.dashed`. */
  dash: "4 4",
} as const;

export const MARKER_DEFAULTS = {
  /** Circle radius in viewBox units. */
  radius: 3,
  /** Extra radius around selected marker dots, in viewBox units. */
  selectedRingGap: 4,
  /** Halo stroke width behind the marker circle. */
  haloWidth: 1.5,
  /** Halo stroke width behind label text (markers and live objects). */
  labelHaloWidth: 3,
  /** Label font size (markers and live objects). */
  labelFontSize: 9,
  /** Label x-offset past the marker radius. */
  labelGap: 3,
} as const;

export const LIVE_DEFAULTS = {
  /** Plane glyph outline (nose up), in viewBox units at counterScale 1. */
  glyph: [
    [0, -7],
    [4.2, 6],
    [0, 3.2],
    [-4.2, 6],
  ] as const,
  /** Halo casing stroke width behind the glyph. */
  haloWidth: 1.6,
  /** Halo-colored casing stroke width under the trail. */
  trailCasingWidth: 2.5,
  /** Trail stroke width. */
  trailWidth: 1,
  /** Trail stroke opacity. */
  trailOpacity: 0.6,
} as const;

/** The plane glyph as an SVG path `d` string, derived from {@link LIVE_DEFAULTS}. */
export const LIVE_GLYPH_D =
  LIVE_DEFAULTS.glyph.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ") + " Z";

export const PATTERN_DEFAULTS = {
  /** Diagonal hatch fill. */
  hatch: { spacing: 6, strokeWidth: 1.4 },
  /** Dot-grid fill. */
  dots: { spacing: 7, radius: 1.1, offset: 2 },
} as const;
