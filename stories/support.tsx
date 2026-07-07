// Shared story scaffolding. Uses only public @cublya/geomap exports.
import * as React from "react";
import { prepareCountries } from "@cublya/geomap";
import type { Topology } from "topojson-specification";
import world110 from "world-atlas/countries-110m.json";
import world50 from "world-atlas/countries-50m.json";
import world10 from "world-atlas/countries-10m.json";

export const world = prepareCountries(world110 as unknown as Topology, { exclude: ["AQ"] });
export const worldDetailed = prepareCountries(world50 as unknown as Topology, {
  exclude: ["AQ"],
});
export const worldComplete = prepareCountries(world10 as unknown as Topology, {
  exclude: ["AQ"],
});

/** Deterministic mock "score" per country so choropleths are stable. */
export function mockScore(id: string): number {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % 101;
  return hash;
}

/**
 * OKLCH by default, hex fallback. A single SVG `fill` attribute can't carry a
 * fallback, and an unparsed color makes the shape fall back to black — not the
 * hex — so we pick the supported syntax once at runtime.
 */
const supportsOklch =
  typeof CSS !== "undefined" &&
  typeof CSS.supports === "function" &&
  CSS.supports("color", "oklch(0.5 0.1 200)");

export const paint = (oklch: string, hex: string): string => (supportsOklch ? oklch : hex);

/** Sequential teal ramp with perceptually-uniform (even-lightness) OKLCH steps. */
export const SCORE_BINS = [
  paint("oklch(0.956 0.015 182)", "#e6f4f1"),
  paint("oklch(0.866 0.049 182)", "#b0ded5"),
  paint("oklch(0.765 0.077 182)", "#79c3b6"),
  paint("oklch(0.632 0.088 187)", "#3f9b93"),
  paint("oklch(0.503 0.083 189)", "#12736e"),
] as const;

/** Single accent for markers/routes/live objects. */
export const ACCENT = paint("oklch(0.531 0.089 191)", "#0e7c78");

/** Secondary accent (crimson) that contrasts the teal without leaning orange. */
export const ACCENT_ALT = paint("oklch(0.551 0.186 13)", "#c62f52");

/** Categorical pair for two-way splits — blue + gold stays color-blind safe. */
export const CVD_BLUE = paint("oklch(0.542 0.142 256)", "#2f6fc0");
export const CVD_GOLD = paint("oklch(0.805 0.143 88)", "#e6b93f");

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
