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
  /** Halo stroke width behind the marker circle. */
  haloWidth: 1.5,
  /** Halo stroke width behind label text (markers and live objects). */
  labelHaloWidth: 3,
  /** Label font size (markers and live objects). */
  labelFontSize: 9,
  /** Label x-offset past the marker radius. */
  labelGap: 3,
} as const;
