// Shared story scaffolding. Uses only public @cublya/geomap exports.
import * as React from "react";
import { prepareCountries } from "@cublya/geomap";
import type { Topology } from "topojson-specification";
import world110 from "world-atlas/countries-110m.json";
import world50 from "world-atlas/countries-50m.json";

export const world = prepareCountries(world110 as unknown as Topology, { exclude: ["AQ"] });
export const worldDetailed = prepareCountries(world50 as unknown as Topology, {
  exclude: ["AQ"],
});

/** Deterministic mock "score" per country so choropleths are stable. */
export function mockScore(id: string): number {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % 101;
  return hash;
}

export const SCORE_BINS = ["#e8e3f7", "#c6b8ee", "#a48ce2", "#7f61d3", "#5636b8"] as const;

export function scoreFill(id: string): string {
  return SCORE_BINS[Math.min(SCORE_BINS.length - 1, Math.floor((mockScore(id) / 101) * SCORE_BINS.length))]!;
}

export const CITIES = [
  { id: "vie", label: "Vienna", coordinates: { lat: 48.2082, lng: 16.3738 } },
  { id: "tyo", label: "Tokyo", coordinates: { lat: 35.6762, lng: 139.6503 } },
  { id: "nyc", label: "New York", coordinates: { lat: 40.7128, lng: -74.006 } },
  { id: "syd", label: "Sydney", coordinates: { lat: -33.8688, lng: 151.2093 } },
  { id: "gig", label: "Rio de Janeiro", coordinates: { lat: -22.9068, lng: -43.1729 } },
  { id: "nbo", label: "Nairobi", coordinates: { lat: -1.2921, lng: 36.8219 } },
];

/** Standard story frame so maps get a real height inside Storybook. */
export function Frame({
  children,
  dark,
  height = 480,
}: {
  children: React.ReactNode;
  dark?: boolean;
  height?: number;
}) {
  return (
    <div
      style={{
        position: "relative",
        height,
        borderRadius: 12,
        overflow: "hidden",
        background: dark ? "#101314" : "#f7f5f0",
      }}
    >
      {children}
    </div>
  );
}
