// Accurate continent outlines, assembled from the @cublya/world-atlas 110m
// countries by dissolving internal borders per continent with topojson `merge`.
// This lives in the stories tree (not the shipped package) because it is demo
// scaffolding, not a basemap — the story feeds the result to `prepareCountries`
// exactly like any other local GeoJSON FeatureCollection.
import { merge } from "topojson-client";
import polygonClipping from "polygon-clipping";
import type {
  GeometryCollection,
  MultiPolygon as TopoMultiPolygon,
  Polygon as TopoPolygon,
  Topology,
} from "topojson-specification";
import type { FeatureCollection, MultiPolygon, Position } from "geojson";
import world110 from "@cublya/world-atlas/countries-110m.json";

type CountryProps = { isoA2?: string; name?: string };
// Atlas country geometries are all Polygon/MultiPolygon — the shapes `merge` accepts.
type CountryGeometry = (TopoPolygon<CountryProps> | TopoMultiPolygon<CountryProps>) & {
  properties: CountryProps;
};

// ISO 3166-1 alpha-2 → continent. Europe and Asia are merged into "Eurasia" so
// the Ural/Bosphorus boundary needs no arbitrary cut; the Americas, Africa and
// Oceania are conventional. Antarctica is dropped below.
const CONTINENT: Record<string, string> = {
  // North America (incl. Central America, the Caribbean and Greenland)
  CA: "North America", US: "North America", MX: "North America", GL: "North America",
  GT: "North America", BZ: "North America", HN: "North America", SV: "North America",
  NI: "North America", CR: "North America", PA: "North America", CU: "North America",
  DO: "North America", HT: "North America", JM: "North America", BS: "North America",
  PR: "North America", TT: "North America",
  // South America
  CO: "South America", VE: "South America", GY: "South America", SR: "South America",
  BR: "South America", EC: "South America", PE: "South America", BO: "South America",
  PY: "South America", CL: "South America", AR: "South America", UY: "South America",
  FK: "South America",
  // Africa
  DZ: "Africa", AO: "Africa", BJ: "Africa", BW: "Africa", BF: "Africa", BI: "Africa",
  CM: "Africa", CF: "Africa", TD: "Africa", CG: "Africa", CD: "Africa", CI: "Africa",
  DJ: "Africa", EG: "Africa", GQ: "Africa", ER: "Africa", ET: "Africa", GA: "Africa",
  GH: "Africa", GN: "Africa", GW: "Africa", GM: "Africa", KE: "Africa", LS: "Africa",
  LR: "Africa", LY: "Africa", MG: "Africa", MW: "Africa", ML: "Africa", MR: "Africa",
  MZ: "Africa", NA: "Africa", NE: "Africa", NG: "Africa", RW: "Africa", SN: "Africa",
  SL: "Africa", SO: "Africa", ZA: "Africa", SS: "Africa", SD: "Africa", SZ: "Africa",
  TZ: "Africa", TG: "Africa", TN: "Africa", UG: "Africa", EH: "Africa", ZM: "Africa",
  ZW: "Africa", MA: "Africa",
  // Eurasia — Europe
  AL: "Eurasia", AT: "Eurasia", BA: "Eurasia", BE: "Eurasia", BG: "Eurasia", BY: "Eurasia",
  CH: "Eurasia", CY: "Eurasia", CZ: "Eurasia", DE: "Eurasia", DK: "Eurasia", EE: "Eurasia",
  ES: "Eurasia", FI: "Eurasia", GB: "Eurasia", GR: "Eurasia", HR: "Eurasia", HU: "Eurasia",
  IE: "Eurasia", IS: "Eurasia", IT: "Eurasia", LT: "Eurasia", LU: "Eurasia", LV: "Eurasia",
  MD: "Eurasia", ME: "Eurasia", MK: "Eurasia", NL: "Eurasia", PL: "Eurasia", PT: "Eurasia",
  RO: "Eurasia", RS: "Eurasia", RU: "Eurasia", SE: "Eurasia", SI: "Eurasia", SK: "Eurasia",
  UA: "Eurasia",
  // Eurasia — Asia
  AE: "Eurasia", AF: "Eurasia", AM: "Eurasia", AZ: "Eurasia", BD: "Eurasia", BN: "Eurasia",
  BT: "Eurasia", CN: "Eurasia", "CN-TW": "Eurasia", GE: "Eurasia", ID: "Eurasia", IL: "Eurasia",
  IN: "Eurasia", IQ: "Eurasia", IR: "Eurasia", JO: "Eurasia", JP: "Eurasia", KG: "Eurasia",
  KH: "Eurasia", KP: "Eurasia", KR: "Eurasia", KW: "Eurasia", KZ: "Eurasia", LA: "Eurasia",
  LB: "Eurasia", LK: "Eurasia", MM: "Eurasia", MN: "Eurasia", MY: "Eurasia", NP: "Eurasia",
  OM: "Eurasia", PH: "Eurasia", PK: "Eurasia", PS: "Eurasia", QA: "Eurasia", SA: "Eurasia",
  SY: "Eurasia", TH: "Eurasia", TJ: "Eurasia", TL: "Eurasia", TM: "Eurasia", TR: "Eurasia",
  UZ: "Eurasia", VN: "Eurasia", YE: "Eurasia",
  // Oceania
  AU: "Oceania", NZ: "Oceania", PG: "Oceania", FJ: "Oceania", SB: "Oceania", VU: "Oceania",
  NC: "Oceania",
};

// France and Norway carry no isoA2 in Natural Earth (the `-99` quirk), so map
// them by name.
const NAME_CONTINENT: Record<string, string> = { France: "Eurasia", Norway: "Eurasia" };
const EXCLUDE = new Set(["Antarctica", "Fr. S. Antarctic Lands"]);

const topology = world110 as unknown as Topology;
const geometries = (topology.objects.countries as GeometryCollection<CountryProps>)
  .geometries as CountryGeometry[];

const groups = new Map<string, CountryGeometry[]>();
for (const geometry of geometries) {
  const { isoA2, name } = geometry.properties;
  if (name && EXCLUDE.has(name)) continue;
  const continent = (isoA2 && CONTINENT[isoA2]) || (name && NAME_CONTINENT[name]);
  if (!continent) continue;
  let group = groups.get(continent);
  if (!group) groups.set(continent, (group = []));
  group.push(geometry);
}

const dissolve = (continent: string): MultiPolygon => merge(topology, groups.get(continent)!);

// The conventional Europe/Asia divide as a clipping polygon: down the Ural
// Mountains, along the Ural River to the Caspian, across the Greater Caucasus
// crest to the Black Sea, and through the Bosphorus. Only the segments that
// cross land (the Urals, the Caucasus isthmus, Turkish Thrace) matter; the rest
// runs over ocean and is trimmed away by the coastline. This is the "natural"
// boundary — it splits Russia, Kazakhstan and Turkey mid-country, which country
// borders never would.
const EUROPE_CLIP: Position[][] = [
  [
    [-35, 84], [70, 84], [67, 69], [66, 66], [60, 60], [59, 54], [57, 51],
    [51, 47], [49, 45], [48, 41], [43, 43], [40, 43], [36, 44], [29, 41],
    [26, 40], [26, 34], [-10, 34], [-35, 40], [-35, 84],
  ],
];

// Eurasia's main landmass ring crosses the antimeridian (Chukotka pokes past
// +180). d3-geo stitches that spherically, but polygon-clipping is planar and
// would fill a full-width band across the map. So "unroll" every ring — walk its
// vertices and shift longitudes by ±360 whenever an edge would jump the
// antimeridian, keeping the ring geometrically continuous — clip, then wrap the
// results back into [-180, 180] so d3 renders the seam correctly.
const unroll = (ring: Position[]): Position[] => {
  const out: Position[] = [ring[0]!.slice()];
  let offset = 0;
  for (let i = 1; i < ring.length; i++) {
    let lon = ring[i]![0]! + offset;
    const prevLon = out[i - 1]![0]!;
    while (lon - prevLon > 180) {
      offset -= 360;
      lon -= 360;
    }
    while (lon - prevLon < -180) {
      offset += 360;
      lon += 360;
    }
    out.push([lon, ring[i]![1]!]);
  }
  return out;
};
const unwrap = (polygons: Position[][][]): Position[][][] =>
  polygons.map((rings) => rings.map(unroll));
const rewrap = (polygons: Position[][][]): Position[][][] =>
  polygons.map((rings) =>
    rings.map((ring) => ring.map((p) => [((((p[0]! + 180) % 360) + 360) % 360) - 180, p[1]!])),
  );

type PcGeom = Parameters<typeof polygonClipping.intersection>[0];
const eurasiaLand = unwrap(dissolve("Eurasia").coordinates) as PcGeom;
const clip = [EUROPE_CLIP] as PcGeom;
const europe: MultiPolygon = {
  type: "MultiPolygon",
  coordinates: rewrap(polygonClipping.intersection(eurasiaLand, clip) as Position[][][]),
};
const asia: MultiPolygon = {
  type: "MultiPolygon",
  coordinates: rewrap(polygonClipping.difference(eurasiaLand, clip) as Position[][][]),
};

const feature = (name: string, geometry: MultiPolygon) => ({
  type: "Feature" as const,
  properties: { name },
  geometry,
});

/** One dissolved MultiPolygon feature per continent, ready for `prepareCountries`. */
export const CONTINENTS: FeatureCollection<MultiPolygon, { name: string }> = {
  type: "FeatureCollection",
  features: [
    feature("North America", dissolve("North America")),
    feature("South America", dissolve("South America")),
    feature("Africa", dissolve("Africa")),
    feature("Europe", europe),
    feature("Asia", asia),
    feature("Oceania", dissolve("Oceania")),
  ],
};
