import * as React from "react";
import type { RefObject } from "react";
import type { GeoPath, GeoProjection } from "d3-geo";
import type { Coordinate } from "../types";
import type { ResolvedGeoTheme } from "../theme";

export interface GeoContextValue {
  projection: GeoProjection;
  /** d3 geoPath bound to the projection — `path(featureOrGeometry)` → SVG `d`. */
  path: GeoPath;
  size: { width: number; height: number };
  /**
   * Project a coordinate to viewBox space. Returns null when the point is not
   * renderable (globe backface, projection clip).
   */
  project: (c: Coordinate) => [number, number] | null;
  isVisible: (c: Coordinate) => boolean;
  /**
   * Multiply marker/icon sizes by this to keep them screen-constant: 1/zoom on
   * the flat map (which scales a group), 1 on the globe (which reprojects).
   */
  counterScale: number;
  theme: ResolvedGeoTheme;
  /** True while a pan/rotate drag is in progress — used to suppress hover. */
  isDraggingRef: RefObject<boolean>;
  patternIds: { hatch: string; dots: string };
}

// Guarded so importing the package in a React Server Component works: the
// react-server build of React has no createContext, but server code only needs
// the core exports (prepareCountries, renderStaticMapSvg, …) — the components
// themselves must render inside a client boundary anyway.
const GeoContext =
  typeof React.createContext === "function"
    ? React.createContext<GeoContextValue | null>(null)
    : (null as unknown as React.Context<GeoContextValue | null>);

export const GeoProvider = (
  GeoContext ? GeoContext.Provider : null
) as React.Provider<GeoContextValue | null>;

/** Access projection/path/etc. from a custom layer rendered inside GeoMap/GeoGlobe. */
export function useGeo(): GeoContextValue {
  const value = React.useContext(GeoContext);
  if (!value) throw new Error("useGeo must be used inside <GeoMap> or <GeoGlobe>");
  return value;
}
