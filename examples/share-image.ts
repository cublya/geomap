// -style share image: render the map to a standalone SVG string, preview it
// as a data URL, then rasterize to a PNG blob for download. Colors must be
// concrete here — CSS variables can't resolve outside a page.
import {
  prepareCountries,
  renderStaticMapSvg,
  svgToDataUrl,
  svgToPngBlob,
} from "@cublya/geomap";
import type { Topology } from "topojson-specification";
import world110 from "@cublya/world-atlas/countries-110m.json";

const world = prepareCountries(world110 as unknown as Topology, { exclude: ["AQ"] });

const PALETTES = {
  light: { background: "#f7f5f0", land: "#e3e0d8", visited: "#e07a5f" },
  dark: { background: "#101314", land: "#23272a", visited: "#e07a5f" },
};

export async function buildShareImage(
  visitedIds: ReadonlySet<string>,
  theme: "light" | "dark",
): Promise<{ previewUrl: string; download: () => Promise<Blob> }> {
  const palette = PALETTES[theme];
  const svg = renderStaticMapSvg({
    width: 1080,
    height: 1080,
    background: palette.background,
    countries: {
      data: world,
      fill: (c) => (visitedIds.has(c.id) ? palette.visited : palette.land),
    },
    theme: { landStroke: "oklch(0.2 0 0 / 0.15)" },
  });

  return {
    previewUrl: svgToDataUrl(svg), // <img src={previewUrl}> for a live preview
    download: () => svgToPngBlob(svg, { width: 1080, height: 1080, scale: 2 }),
  };
}
