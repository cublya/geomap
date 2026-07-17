import type { Feature, Geometry } from "geojson";
import type { Outline } from "./core/outline";

/** GeoJSON coordinate order: [longitude, latitude]. */
export type LonLat = [lon: number, lat: number];

/** Any coordinate shape the four host apps use; normalised via {@link toLonLat}. */
export type Coordinate =
  | LonLat
  | { lat: number; lng: number }
  | { lat: number; lon: number };

/** Geographic bounding box: [[west, south], [east, north]]. */
export type GeoBounds = [LonLat, LonLat];

/** d3 rotation triple: [lambda, phi, gamma] in degrees. */
export type Rotation = [number, number, number];

/** Rendering backend for browser map/globe components. */
export type GeoRenderer = "svg" | "canvas";

/**
 * A renderable geographic feature, independent of what it represents. The unit
 * of styling for map layers: countries today, but regions, subregions, or
 * custom geometry can extend this so layers and callbacks stay reusable.
 */
export interface PreparedFeature {
  /** Canonical id: lowercase alpha-2 when known, else numeric code, else a name slug. */
  id: string;
  name: string;
  feature: Feature<Geometry, Record<string, unknown>>;
  centroid: LonLat;
  bounds: GeoBounds;
}

export interface PreparedCountry extends PreparedFeature {
  numeric: string | null;
  alpha2: string | null;
  alpha3: string | null;
}

export interface CountrySet {
  countries: readonly PreparedCountry[];
  /** Lookup by any ISO code (any case), canonical id, or country name. */
  get(codeOrName: string): PreparedCountry | undefined;
}

export interface GeoMarker<T = unknown> {
  id: string;
  coordinates: Coordinate;
  kind?: "city" | "airport" | "point" | (string & {});
  label?: string;
  /** Radius in viewBox units; default 3. */
  size?: number;
  color?: string;
  /** Draw a filled selection ring behind the marker dot when the theme provides one. */
  selected?: boolean;
  /** Per-marker dot casing color; overrides the theme halo. */
  stroke?: string;
  /** Per-marker dot casing width in viewBox units. */
  strokeWidth?: number;
  data?: T;
}

export interface GeoRoute<T = unknown> {
  id: string;
  /** Two or more stops; consecutive pairs are joined by great-circle arcs. */
  stops: Coordinate[];
  /** Route shape. Defaults to the sampled great-circle path. */
  geometry?: "great-circle" | "straight";
  /**
   * Screen-space bow. The quadratic control point is offset perpendicular to
   * each projected segment by `arc` times its length (toward the top of the
   * screen), so the visible curve rises about half of `arc × length`. Takes
   * precedence over `geometry`; `0` or omitted keeps the segment flat.
   */
  arc?: number;
  color?: string;
  width?: number;
  dashed?: boolean;
  opacity?: number;
  data?: T;
}

export interface LiveObject<T = unknown> {
  id: string;
  coordinates: Coordinate;
  /** Navigational heading in degrees: 0 = north, clockwise. */
  heading?: number;
  label?: string;
  color?: string;
  /** Static polyline drawn behind the object (e.g. the travelled path). */
  trail?: Coordinate[];
  data?: T;
}

export const CountryPattern = {
  Hatch: "hatch",
  Dots: "dots",
} as const;
export type CountryPattern = (typeof CountryPattern)[keyof typeof CountryPattern];

export interface CountryHover {
  country: PreparedCountry;
  /** Pointer position in client (viewport) coordinates, for positioning tooltips. */
  point: [x: number, y: number];
}

/**
 * Tuning for the hover-highlight fade. The highlight itself is the translucent
 * `landHover` overlay; this only controls how it animates in and out.
 */
export interface CountryHoverAnimation {
  /** Fade duration in milliseconds. Default 140. `0` disables the transition. */
  durationMs?: number;
  /** CSS easing function for the fade. Default `"ease-out"`. */
  easing?: string;
}

export interface CountriesLayerProps {
  data: CountrySet;
  /** Fill for a country; return undefined for the muted "no data" tone. */
  fill?: (country: PreparedCountry) => string | undefined;
  /**
   * Country border behaviour: a bare mode (`"line" | "gap" | "raised" | "none"`),
   * a full {@link Outline} style, or a per-country callback returning one
   * (`undefined` → the layer default `"line"`). Orthogonal to the colour preset;
   * `outline="gap"` gives cut-paper borders, `outline="raised"` lifts the land.
   * The `raised` drop shadow applies at the layer level (a static value), not
   * per country.
   */
  outline?: Outline | ((country: PreparedCountry) => Outline | undefined);
  /** Outline for the selected country. Defaults to the theme's selection tone. */
  selectedOutline?: Outline;
  /** Non-colour state encoding overlaid on the fill. */
  pattern?: (country: PreparedCountry) => CountryPattern | undefined;
  /** Inert countries: dimmed, no hover highlight, no selection. */
  disabled?: (country: PreparedCountry) => boolean;
  selectedId?: string | null;
  /** Called with null when the ocean/background is clicked. */
  onSelect?: (country: PreparedCountry | null) => void;
  onHover?: (hover: CountryHover | null) => void;
  /**
   * Hover-highlight animation. Defaults to a short fade of the `landHover`
   * overlay; pass an object to tune duration/easing, or `false` for the classic
   * instant highlight. Only applies to styled presets (needs a `landHover`
   * token) on an interactive layer, and `prefers-reduced-motion` always snaps.
   */
  hover?: CountryHoverAnimation | false;
  /**
   * Emit a native SVG `<title>` per country (the browser's built-in hover
   * tooltip). Defaults to `true`, except when `onHover` is set, where it
   * defaults to `false` so the browser's tooltip doesn't double up with your
   * own `GeoTooltip`. Set explicitly to force either way.
   */
  nativeTitle?: boolean;
}

export interface LiveLayerProps<T = unknown> {
  objects: LiveObject<T>[];
  /** Duration of the tween between successive position updates. Default 1000. */
  transitionMs?: number;
}

export const FlatProjectionKind = {
  NaturalEarth1: "naturalEarth1",
  Mercator: "mercator",
  EqualEarth: "equalEarth",
} as const;
export type FlatProjectionKind = (typeof FlatProjectionKind)[keyof typeof FlatProjectionKind];
