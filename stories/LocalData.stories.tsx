import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { GeoMap, prepareCountries } from "@cublya/geomap";
import { Frame, worldComplete, paint, ACCENT, ACCENT_ALT, CVD_BLUE, CVD_GOLD } from "./support";
import { CONTINENTS } from "./continents";

const meta = {
  title: "Data/Local geodata",
  parameters: {
    docs: {
      description: {
        component:
          "The package ships no basemap. `prepareCountries()` accepts any TopoJSON topology (`@cublya/world-atlas` 10m shown here for complete UN-member coverage) or a plain GeoJSON FeatureCollection — identity resolves via numeric ids, ISO properties, then names.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const HighResolutionTopoJSON: Story = {
  name: "@cublya/world-atlas 10m TopoJSON (all UN members)",
  render: () => (
    <Frame>
      <GeoMap
        preset="light"
        countries={{ data: worldComplete }}
        fit={worldComplete.get("NO")!}
        aria-label="Norwegian coastline at 10m resolution"
      />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelectorAll("path[data-country]").length).toBeGreaterThan(200);
    });
  },
};

// `CONTINENTS` is a plain GeoJSON FeatureCollection (see ./continents), one
// dissolved MultiPolygon per continent, assembled locally from the world-atlas.
const customSet = prepareCountries(CONTINENTS);

// A lighter cyan-blue for Asia (distinct from Europe's deeper blue by lightness,
// which survives the common colour-vision deficiencies) and a green for Oceania
// (kept clearly apart from Africa's teal, as requested).
const ASIA_BLUE = paint("oklch(0.7 0.1 232)", "#4fa6d6");
const OCEANIA_GREEN = paint("oklch(0.62 0.12 150)", "#3f9d66");

// Categorical, colour-blind-safe fill per continent (keyed by name).
const CONTINENT_FILL: Record<string, string> = {
  "North America": CVD_GOLD,
  "South America": ACCENT_ALT,
  Africa: ACCENT,
  Europe: CVD_BLUE,
  Asia: ASIA_BLUE,
  Oceania: OCEANIA_GREEN,
};

export const CustomGeoJSON: Story = {
  name: "Continents (local GeoJSON)",
  render: () => (
    <Frame>
      <GeoMap
        preset="light"
        graticule
        countries={{
          data: customSet,
          fill: (c) => CONTINENT_FILL[c.name] ?? ACCENT,
        }}
        fit={[[-160, -50], [178, 74]]}
        aria-label="World continents, each dissolved from its countries and filled by name"
      />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelectorAll("path[data-country]")).toHaveLength(6);
      expect(canvasElement.querySelector('path[data-country="europe"]')).toBeTruthy();
      expect(canvasElement.querySelector('path[data-country="asia"]')).toBeTruthy();
    });
  },
};
