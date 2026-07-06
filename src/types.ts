import type { Feature, Geometry } from "geojson";

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

export interface PreparedCountry {
  /** Canonical id: lowercase alpha-2 when known, else numeric code, else a name slug. */
  id: string;
  numeric: string | null;
  alpha2: string | null;
  alpha3: string | null;
  name: string;
  feature: Feature<Geometry, Record<string, unknown>>;
  centroid: LonLat;
  bounds: GeoBounds;
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
  data?: T;
}

export interface GeoRoute<T = unknown> {
  id: string;
  /** Two or more stops; consecutive pairs are joined by great-circle arcs. */
  stops: Coordinate[];
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

export type CountryPattern = "hatch" | "dots";

export interface CountryHover {
  country: PreparedCountry;
  /** Pointer position in client (viewport) coordinates, for positioning tooltips. */
  point: [x: number, y: number];
}

export interface CountriesLayerProps {
  data: CountrySet;
  /** Fill for a country; return undefined for the muted "no data" tone. */
  fill?: (country: PreparedCountry) => string | undefined;
  stroke?: string;
  /** Non-colour state encoding overlaid on the fill. */
  pattern?: (country: PreparedCountry) => CountryPattern | undefined;
  /** Inert countries: dimmed, no hover highlight, no selection. */
  disabled?: (country: PreparedCountry) => boolean;
  selectedId?: string | null;
  /** Called with null when the ocean/background is clicked. */
  onSelect?: (country: PreparedCountry | null) => void;
  onHover?: (hover: CountryHover | null) => void;
}

export interface LiveLayerProps<T = unknown> {
  objects: LiveObject<T>[];
  /** Duration of the tween between successive position updates. Default 1000. */
  transitionMs?: number;
}

export type FlatProjectionKind = "naturalEarth1" | "mercator" | "equalEarth";
