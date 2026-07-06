import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { GeoMap, prepareCountries } from "@cublya/geo";
import { Frame, scoreFill, worldDetailed } from "./support";

const meta = {
  title: "Data/Local geodata",
  parameters: {
    docs: {
      description: {
        component:
          "The package ships no basemap. `prepareCountries()` accepts any TopoJSON topology (world-atlas 110m/50m shown across these stories) or a plain GeoJSON FeatureCollection — identity resolves via numeric ids, ISO properties, then names.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const HighResolutionTopoJSON: Story = {
  name: "world-atlas 50m TopoJSON",
  render: () => (
    <Frame>
      <GeoMap
        countries={{ data: worldDetailed, fill: (c) => scoreFill(c.id) }}
        fit={worldDetailed.get("NO")!}
        aria-label="Norwegian coastline at 50m resolution"
      />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelectorAll("path[data-country]").length).toBeGreaterThan(200);
    });
  },
};

// A hand-made FeatureCollection: identity resolves from `properties.name`.
const CUSTOM_GEOJSON = {
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature" as const,
      properties: { name: "Germany" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[[6, 47.3], [15, 47.3], [15, 55], [6, 55], [6, 47.3]]],
      },
    },
    {
      type: "Feature" as const,
      properties: { name: "France" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[[-4.7, 42.3], [8, 42.3], [8, 51], [-4.7, 51], [-4.7, 42.3]]],
      },
    },
    {
      type: "Feature" as const,
      properties: { name: "Atlantis" }, // unresolvable → keeps a name-slug id
      geometry: {
        type: "Polygon" as const,
        coordinates: [[[-30, 30], [-24, 30], [-24, 36], [-30, 36], [-30, 30]]],
      },
    },
  ],
};

const customSet = prepareCountries(CUSTOM_GEOJSON);

export const CustomGeoJSON: Story = {
  name: "Hand-rolled GeoJSON",
  render: () => (
    <Frame>
      <GeoMap
        countries={{
          data: customSet,
          fill: (c) => (c.alpha2 ? "#7f61d3" : "#e0a832"),
        }}
        fit={[[-32, 28], [17, 57]]}
        aria-label="Three custom polygons; ISO-resolved ones purple, unknown amber"
      />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector('path[data-country="de"]')).toBeTruthy();
      expect(canvasElement.querySelector('path[data-country="atlantis"]')).toBeTruthy();
    });
  },
};
