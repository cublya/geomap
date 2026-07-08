import {
  geoEqualEarth,
  geoMercator,
  geoNaturalEarth1,
  geoOrthographic,
  type GeoProjection,
} from "d3-geo";
import type { FlatProjectionKind, Rotation } from "../types";

export interface Size {
  width: number;
  height: number;
}

export interface FlatProjectionOptions {
  /** Inset from the viewBox edges, in viewBox units. Default 8. */
  padding?: number;
  /**
   * Base rotation, e.g. [-12, 0, 0] to move the antimeridian seam into the Bering
   * Sea so Russia and Alaska render whole.
   */
  rotate?: Rotation;
}

const FLAT_FACTORIES: Record<FlatProjectionKind, () => GeoProjection> = {
  naturalEarth1: geoNaturalEarth1,
  mercator: geoMercator,
  equalEarth: geoEqualEarth,
};

export type ProjectionInput = FlatProjectionKind | ((size: Size) => GeoProjection);

/** A flat projection fitted to the full sphere within the given viewBox. */
export function createFlatProjection(
  kind: ProjectionInput,
  size: Size,
  options: FlatProjectionOptions = {},
): GeoProjection {
  if (typeof kind === "function") return kind(size);
  const { padding = 8, rotate } = options;
  const projection = FLAT_FACTORIES[kind]();
  if (rotate) projection.rotate(rotate);
  projection.fitExtent(
    [
      [padding, padding],
      [size.width - padding, size.height - padding],
    ],
    { type: "Sphere" },
  );
  return projection;
}

export interface GlobeProjectionResult {
  projection: GeoProjection;
  /** The scale d3 chose to fit the sphere; zoom multiplies it. */
  baseScale: number;
}

/**
 * An orthographic globe fitted to the viewBox with the far hemisphere clipped.
 * Reconfigure the returned instance per frame via `configureGlobe`.
 */
export function createGlobeProjection(size: Size, padding = 8): GlobeProjectionResult {
  const projection = geoOrthographic().clipAngle(90);
  projection.fitExtent(
    [
      [padding, padding],
      [size.width - padding, size.height - padding],
    ],
    { type: "Sphere" },
  );
  return { projection, baseScale: projection.scale() };
}

/** Apply a camera frame to a (reused) globe projection instance. */
export function configureGlobe(
  { projection, baseScale }: GlobeProjectionResult,
  size: Size,
  rotation: Rotation,
  zoom: number,
): GeoProjection {
  return projection
    .rotate(rotation)
    .scale(baseScale * zoom)
    .translate([size.width / 2, size.height / 2]);
}
