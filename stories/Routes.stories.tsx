import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { GeoMap } from "@cublya/geomap";
import { ACCENT, ACCENT_ALT, CITIES, Frame, world } from "./support";

const meta = {
  title: "Layers/Routes",
  parameters: {
    docs: {
      description: {
        component:
          "Great-circle routes. Two stops draw one arc; more stops chain into a multi-stop itinerary. d3 handles antimeridian clipping on the sampled line.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const [vie, tyo, nyc, syd, gig, nbo] = CITIES;

export const GreatCircle: Story = {
  render: () => (
    <Frame>
      <GeoMap
        preset="light"
        countries={{ data: world }}
        markers={[vie!, nyc!, tyo!]}
        routes={[
          { id: "vie-nyc", stops: [vie!.coordinates, nyc!.coordinates], color: ACCENT },
          {
            id: "nyc-tyo",
            stops: [nyc!.coordinates, tyo!.coordinates],
            color: ACCENT_ALT,
            dashed: true,
          },
        ]}
        aria-label="Great-circle arcs between Vienna, New York and Tokyo"
      />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelectorAll(".geomap-route").length).toBe(2);
    });
  },
};

export const MultiStop: Story = {
  render: () => (
    <Frame>
      <GeoMap
        preset="light"
        countries={{ data: world }}
        markers={CITIES}
        routes={[
          {
            id: "world-tour",
            // One continuous itinerary; consecutive stops joined by great circles
            // (crosses the antimeridian between Sydney and Rio).
            stops: [vie!, nbo!, syd!, gig!, nyc!, tyo!].map((c) => c.coordinates),
            width: 1.6,
          },
        ]}
        aria-label="A six-stop world tour as one route"
      />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelectorAll(".geomap-route").length).toBe(1);
      expect(
        canvasElement.querySelector(".geomap-route")!.getAttribute("d")!.length,
      ).toBeGreaterThan(100);
    });
  },
};
