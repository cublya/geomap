import { geoArea, geoBounds, geoCentroid } from "d3-geo";
import { feature as topoFeature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry, Position } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { CountrySet, GeoBounds, LonLat, PreparedCountry } from "../types";
import { lookupIso, normalizeName, resolveCountryName, type IsoCountry } from "./iso";

export type CountryFeature = Feature<Geometry, Record<string, unknown>>;
export type CountrySource =
  | Topology
  | FeatureCollection<Geometry, Record<string, unknown>>;

export interface PrepareCountriesOptions {
  /** TopoJSON object name; default "countries" (`@cublya/world-atlas` convention). */
  object?: string;
  /** Codes/ids/names to drop, e.g. ["AQ"] to remove Antarctica. */
  exclude?: string[];
  /**
   * Editorial geometry adjustments (border reassignments, merges) applied before
   * identity resolution. The package ships none.
   */
  patchFeatures?: (features: CountryFeature[]) => CountryFeature[];
}

function isTopology(source: CountrySource): source is Topology {
  return source.type === "Topology";
}

function toFeatures(source: CountrySource, object: string): CountryFeature[] {
  if (isTopology(source)) {
    const objects = source.objects[object];
    if (!objects) {
      throw new Error(
        `prepareCountries: topology has no object "${object}" (available: ${Object.keys(source.objects).join(", ")})`,
      );
    }
    const collection = topoFeature(
      source,
      objects as GeometryCollection<Record<string, unknown>>,
    );
    return collection.features as CountryFeature[];
  }
  return source.features.map((f) => ({ ...f, properties: f.properties ?? {} }));
}

/**
 * Normalize polygon winding for d3-geo. RFC 7946 GeoJSON winds exterior rings
 * counterclockwise, but d3-geo expects the opposite: a ring enclosing more than
 * a hemisphere (area > 2π steradians) is read as covering the whole sphere minus
 * the intended region, which renders as a globe-filling fill. Reversing every
 * ring of an inverted polygon flips the exterior and keeps holes opposite to it.
 * TopoJSON output is already d3-wound, so this is a no-op there.
 */
function rewindPolygon(rings: Position[][]): Position[][] {
  if (rings.length === 0) return rings;
  const inverted = geoArea({ type: "Polygon", coordinates: rings }) > 2 * Math.PI;
  return inverted ? rings.map((ring) => [...ring].reverse()) : rings;
}

function rewindFeature(feature: CountryFeature): CountryFeature {
  const geometry = feature.geometry;
  if (geometry.type === "Polygon") {
    return { ...feature, geometry: { ...geometry, coordinates: rewindPolygon(geometry.coordinates) } };
  }
  if (geometry.type === "MultiPolygon") {
    return {
      ...feature,
      geometry: { ...geometry, coordinates: geometry.coordinates.map(rewindPolygon) },
    };
  }
  return feature;
}

function propString(props: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = props[key];
    if (typeof value === "string" && value && value !== "-99") return value;
    if (typeof value === "number" && value >= 0) return String(value);
  }
  return undefined;
}

function resolveIdentity(feature: CountryFeature): IsoCountry | undefined {
  const id = feature.id;
  if ((typeof id === "string" && /^\d+$/.test(id)) || typeof id === "number") {
    const hit = lookupIso(id);
    if (hit) return hit;
  }
  const props = feature.properties;
  const alpha2 = propString(props, ["iso_a2", "ISO_A2", "iso_a2_eh", "alpha2"]);
  if (alpha2) {
    const hit = lookupIso(alpha2);
    if (hit) return hit;
  }
  const alpha3 = propString(props, ["iso_a3", "ISO_A3", "iso_a3_eh", "adm0_a3", "alpha3"]);
  if (alpha3) {
    const hit = lookupIso(alpha3);
    if (hit) return hit;
  }
  const numeric = propString(props, ["iso_n3", "ISO_N3", "un_a3"]);
  if (numeric) {
    const hit = lookupIso(numeric);
    if (hit) return hit;
  }
  const name = propString(props, ["name", "NAME", "admin", "ADMIN", "name_long"]);
  if (name) return resolveCountryName(name);
  return undefined;
}

function slug(name: string): string {
  return normalizeName(name).replace(/\s+/g, "-") || "unknown";
}

/**
 * Convert a TopoJSON topology (e.g. `@cublya/world-atlas`) or GeoJSON FeatureCollection
 * into a {@link CountrySet} with resolved ISO identity, centroids and bounds.
 */
export function prepareCountries(
  source: CountrySource,
  options: PrepareCountriesOptions = {},
): CountrySet {
  const { object = "countries", exclude = [], patchFeatures } = options;

  let features = toFeatures(source, object);
  if (patchFeatures) features = patchFeatures(features);

  const excludeKeys = new Set(exclude.map((e) => normalizeName(String(e))));
  const isExcluded = (c: PreparedCountry) =>
    [c.id, c.numeric, c.alpha2, c.alpha3, c.name]
      .filter((v): v is string => v != null)
      .some((v) => excludeKeys.has(normalizeName(v)));

  const countries: PreparedCountry[] = [];
  for (const rawFeature of features) {
    const feature = rewindFeature(rawFeature);
    const iso = resolveIdentity(feature);
    const name =
      iso?.name ??
      propString(feature.properties, ["name", "NAME", "admin", "ADMIN"]) ??
      String(feature.id ?? "Unknown");
    const numeric =
      iso?.numeric ??
      (typeof feature.id === "string" && /^\d+$/.test(feature.id)
        ? feature.id.padStart(3, "0")
        : typeof feature.id === "number" && feature.id >= 0
          ? String(feature.id).padStart(3, "0")
          : null);
    const country: PreparedCountry = {
      id: iso ? iso.alpha2.toLowerCase() : (numeric ?? slug(name)),
      numeric,
      alpha2: iso?.alpha2 ?? null,
      alpha3: iso?.alpha3 ?? null,
      name,
      feature,
      centroid: geoCentroid(feature) as LonLat,
      bounds: geoBounds(feature) as GeoBounds,
    };
    if (!isExcluded(country)) countries.push(country);
  }

  const index = new Map<string, PreparedCountry>();
  const register = (key: string | null, country: PreparedCountry) => {
    if (!key) return;
    const k = normalizeName(key);
    if (k && !index.has(k)) index.set(k, country);
  };
  for (const country of countries) {
    register(country.id, country);
    register(country.alpha2, country);
    register(country.alpha3, country);
    register(country.numeric, country);
    register(country.name, country);
    const mergedMapUnits = country.feature.properties.policyMergedMapUnits;
    if (Array.isArray(mergedMapUnits)) {
      for (const mapUnit of mergedMapUnits) {
        if (typeof mapUnit === "string") register(mapUnit, country);
      }
    }
  }

  return {
    countries,
    get(codeOrName: string) {
      const direct = index.get(normalizeName(String(codeOrName)));
      if (direct) return direct;
      const raw = String(codeOrName).trim();
      // Unpadded numerics ("40" → "040") and atlas alias names both funnel
      // through the ISO tables.
      const iso = /^\d+$/.test(raw) ? lookupIso(raw) : resolveCountryName(raw);
      if (iso) {
        return (
          index.get(normalizeName(iso.alpha2)) ??
          index.get(normalizeName(iso.numeric))
        );
      }
      return undefined;
    },
  };
}
