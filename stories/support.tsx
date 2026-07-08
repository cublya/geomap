// Shared story scaffolding. Uses only public @cublya/geomap exports.
import * as React from "react";
import { prepareCountries } from "@cublya/geomap";
import type { Topology } from "topojson-specification";
import world110 from "@cublya/world-atlas/countries-110m.json";
import world50 from "@cublya/world-atlas/countries-50m.json";
import world10 from "@cublya/world-atlas/countries-10m.json";

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
 * fallback, and an unparsed color makes the shape fall back to black, not the
 * hex, so we pick the supported syntax once at runtime.
 */
const supportsOklch =
  typeof CSS !== "undefined" &&
  typeof CSS.supports === "function" &&
  CSS.supports("color", "oklch(0.5 0.1 200)");

export const paint = (oklch: string, hex: string): string => (supportsOklch ? oklch : hex);

/**
 * Sequential blue ramp with perceptually-uniform (even-lightness) OKLCH steps,
 * anchored on `CVD_BLUE` (the darkest bin) so the choropleth shares the
 * color-blind-safe blue used by the categorical map.
 */
export const SCORE_BINS = [
  paint("oklch(0.958 0.018 256)", "#e9f2fe"),
  paint("oklch(0.868 0.05 256)", "#bfd6f5"),
  paint("oklch(0.76 0.088 256)", "#8cb4e9"),
  paint("oklch(0.65 0.12 256)", "#5c91d7"),
  paint("oklch(0.542 0.142 256)", "#2f6fc0"),
] as const;

/** Single accent for markers/routes/live objects. */
export const ACCENT = paint("oklch(0.531 0.089 191)", "#0e7c78");

/**
 * Secondary accent: a color-blind-safe vermillion (the Okabe-Ito red stand-in)
 * that keeps red's attention-grabbing warmth while staying distinguishable from
 * the teal primary under the common forms of color vision deficiency.
 */
export const ACCENT_ALT = paint("oklch(0.6 0.17 42)", "#d05418");

/** Categorical pair for two-way splits: blue + gold stays color-blind safe. */
export const CVD_BLUE = paint("oklch(0.542 0.142 256)", "#2f6fc0");
export const CVD_GOLD = paint("oklch(0.805 0.143 88)", "#e6b93f");

function scoreBin(id: string): number {
  return Math.min(SCORE_BINS.length - 1, Math.floor((mockScore(id) / 101) * SCORE_BINS.length));
}

export function scoreFill(id: string): string {
  return SCORE_BINS[scoreBin(id)]!;
}

/**
 * Readable ink for a chip painted with `scoreFill`. Only the darkest blue bin
 * needs near-white text; the paler blues take a deep-blue near-black so the
 * numbers stay legible in both OKLCH and hex-fallback rendering.
 */
export function scoreTextColor(id: string): string {
  return scoreBin(id) >= 4
    ? paint("oklch(0.98 0.01 256)", "#f6f8fc")
    : paint("oklch(0.32 0.07 256)", "#15294a");
}

export const CITIES = [
  { id: "vie", label: "Vienna", coordinates: { lat: 48.2082, lng: 16.3738 } },
  { id: "tyo", label: "Tokyo", coordinates: { lat: 35.6762, lng: 139.6503 } },
  { id: "nyc", label: "New York", coordinates: { lat: 40.7128, lng: -74.006 } },
  { id: "syd", label: "Sydney", coordinates: { lat: -33.8688, lng: 151.2093 } },
  { id: "gig", label: "Rio de Janeiro", coordinates: { lat: -22.9068, lng: -43.1729 } },
  { id: "nbo", label: "Nairobi", coordinates: { lat: -1.2921, lng: 36.8219 } },
];

/**
 * Polished demo button matching the map's preset surfaces (control-bg / -ink /
 * -border tokens), so the story toolbars read as part of the same UI instead of
 * bare browser buttons. Hover is handled with local state since inline styles
 * can't express `:hover`.
 */
export function DemoButton({
  dark,
  active,
  children,
  style,
  onPointerEnter,
  onPointerLeave,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { dark?: boolean; active?: boolean }) {
  const [hover, setHover] = React.useState(false);
  const ink = dark ? "oklch(0.93 0.005 90)" : "oklch(0.3 0.01 90)";
  const bg = dark ? "oklch(0.27 0.008 250)" : "oklch(0.985 0.002 90)";
  const bgHover = dark ? "oklch(0.32 0.008 250)" : "oklch(0.95 0.004 90)";
  const bd = dark ? "oklch(0.95 0.01 90 / 0.18)" : "oklch(0.25 0.01 90 / 0.14)";
  return (
    <button
      type="button"
      {...rest}
      onPointerEnter={(e) => {
        setHover(true);
        onPointerEnter?.(e);
      }}
      onPointerLeave={(e) => {
        setHover(false);
        onPointerLeave?.(e);
      }}
      style={{
        appearance: "none",
        font: "500 13px system-ui, -apple-system, sans-serif",
        color: ink,
        background: active || hover ? bgHover : bg,
        border: `1px solid ${bd}`,
        borderRadius: 8,
        padding: "6px 12px",
        cursor: "pointer",
        boxShadow: "0 1px 2px oklch(0.15 0.02 260 / 0.1), 0 4px 10px oklch(0.15 0.02 260 / 0.06)",
        transition: "background 120ms ease",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/** Absolutely-positioned toolbar wrapper for the demo buttons above a map. */
export function Toolbar({
  children,
  corner = "top-left",
}: {
  children: React.ReactNode;
  corner?: "top-left" | "top-right";
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: corner === "top-left" ? 12 : undefined,
        right: corner === "top-right" ? 12 : undefined,
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      {children}
    </div>
  );
}

/** Standard story frame so maps get a real height inside Storybook. */
export const Frame = React.forwardRef<
  HTMLDivElement,
  { children: React.ReactNode; dark?: boolean; height?: number }
>(function Frame({ children, dark, height = 480 }, ref) {
  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        height,
        borderRadius: 12,
        overflow: "hidden",
        // Match the preset ocean tokens so the map/globe disc blends into the
        // frame instead of sitting on a mismatched backdrop.
        background: dark ? "oklch(0.21 0.008 250)" : "oklch(0.97 0.006 90)",
      }}
    >
      {children}
    </div>
  );
});
