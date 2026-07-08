// Great-circle flight routes with animated planes. Feed real
// positions at any cadence; the live layer slerps between updates.
import * as React from "react";
import {
  GeoMap,
  bearingBetween,
  interpolateGreatCircle,
  prepareCountries,
  type Coordinate,
  type LiveObject,
} from "@cublya/geomap";
import type { Topology } from "topojson-specification";
import world110 from "@cublya/world-atlas/countries-110m.json";

const world = prepareCountries(world110 as unknown as Topology, { exclude: ["AQ"] });

interface Flight {
  id: string;
  number: string;
  origin: Coordinate;
  destination: Coordinate;
  progress: number; // 0..1 along the great circle, from your live feed
  airborne: boolean;
}

function toLiveObject(f: Flight): LiveObject {
  const position = interpolateGreatCircle(f.origin, f.destination, f.progress);
  const ahead = interpolateGreatCircle(f.origin, f.destination, Math.min(1, f.progress + 0.01));
  return {
    id: f.id,
    coordinates: position,
    heading: bearingBetween(position, ahead),
    label: f.number,
    color: "var(--brand)",
  };
}

export function LiveFlightMap({ flights, focusId }: { flights: Flight[]; focusId?: string }) {
  const focused = flights.find((f) => f.id === focusId);
  return (
    <GeoMap
      preset="light"
      projection="naturalEarth1"
      graticule
      countries={{ data: world }}
      // Frame the focused flight's route; falls back to the whole world.
      fit={focused ? [focused.origin, focused.destination] : "world"}
      routes={flights.map((f) => ({
        id: f.id,
        stops: [f.origin, f.destination],
        dashed: !f.airborne, // dashed = scheduled/on-ground, solid = in air
        opacity: f.id === focusId ? 0.9 : 0.45,
        width: f.id === focusId ? 1.6 : 1,
      }))}
      markers={flights.flatMap((f) => [
        { id: `${f.id}-o`, coordinates: f.origin, kind: "airport" as const },
        { id: `${f.id}-d`, coordinates: f.destination, kind: "airport" as const },
      ])}
      live={{
        objects: flights.filter((f) => f.airborne).map(toLiveObject),
        transitionMs: 1000,
      }}
      aria-label="Live flight map"
    />
  );
}
