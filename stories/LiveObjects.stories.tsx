import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import {
  GeoMap,
  bearingBetween,
  interpolateGreatCircle,
  type LiveObject,
} from "@cublya/geo";
import { Frame, world } from "./support";

const meta = {
  title: "Layers/Live objects",
  parameters: {
    docs: {
      description: {
        component:
          "Animated objects with heading (0° = north, clockwise). Feed positions at any cadence — this demo ticks a simulator once per second — and the layer slerps between updates on one shared rAF loop. Under `prefers-reduced-motion` positions jump instead of gliding.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const FLIGHTS = [
  {
    id: "CB101",
    origin: { lat: 48.11, lng: 16.57 },
    destination: { lat: 40.64, lng: -73.78 },
    startProgress: 0.35,
  },
  {
    id: "CB202",
    origin: { lat: 35.55, lng: 139.78 },
    destination: { lat: -33.95, lng: 151.18 },
    startProgress: 0.6,
  },
  {
    id: "CB303",
    origin: { lat: -22.91, lng: -43.17 },
    destination: { lat: -1.29, lng: 36.82 },
    startProgress: 0.15,
  },
];

function toLiveObject(flight: (typeof FLIGHTS)[number], progress: number): LiveObject {
  const position = interpolateGreatCircle(flight.origin, flight.destination, progress);
  const ahead = interpolateGreatCircle(
    flight.origin,
    flight.destination,
    Math.min(1, progress + 0.01),
  );
  return {
    id: flight.id,
    coordinates: position,
    heading: bearingBetween(position, ahead),
    label: flight.id,
    color: "#5636b8",
  };
}

function LiveFlightsDemo() {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  const objects = FLIGHTS.map((f) =>
    toLiveObject(f, Math.min(0.99, f.startProgress + tick * 0.01)),
  );
  return (
    <Frame>
      <GeoMap
        countries={{ data: world }}
        routes={FLIGHTS.map((f) => ({
          id: f.id,
          stops: [f.origin, f.destination],
          opacity: 0.4,
        }))}
        live={{ objects, transitionMs: 1000 }}
        aria-label="Three simulated flights in progress"
      />
    </Frame>
  );
}

export const Flights: Story = {
  render: () => <LiveFlightsDemo />,
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelectorAll(".cublya-geo-live").length).toBe(3);
    });
    // Every glyph carries a heading rotation.
    const rotated = [...canvasElement.querySelectorAll(".cublya-geo-live g g")].filter((g) =>
      g.getAttribute("transform")?.includes("rotate("),
    );
    expect(rotated.length).toBe(3);
  },
};

export const WithTrail: Story = {
  render: () => (
    <Frame>
      <GeoMap
        countries={{ data: world }}
        live={{
          objects: [
            {
              id: "CB404",
              coordinates: interpolateGreatCircle(
                { lat: 48.11, lng: 16.57 },
                { lat: 35.55, lng: 139.78 },
                0.55,
              ),
              heading: 55,
              label: "CB404",
              trail: [0, 0.15, 0.3, 0.45, 0.55].map((t) =>
                interpolateGreatCircle({ lat: 48.11, lng: 16.57 }, { lat: 35.55, lng: 139.78 }, t),
              ),
            },
          ],
          transitionMs: 0,
        }}
        aria-label="A flight with its travelled trail"
      />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector(".cublya-geo-trail")).toBeTruthy();
    });
  },
};
