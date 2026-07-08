import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { geoCircle } from "d3-geo";
import { GeoMap, useGeo, type Coordinate } from "@cublya/geomap";
import { CITIES, Frame, paint, world } from "./support";

// The overlay sits on two very different backdrops in the `light` preset:
// near-black "ink" land and a pale cream page/ocean. A mid-tone accent washes
// out over the cream, so the rings use a deeper vermillion (still the warm,
// CVD-safe hue) that keeps contrast on both, and the label carries a
// paper-colored halo so it stays legible where it crosses dark land.
const RING = paint("oklch(0.52 0.2 40)", "#bd410f");
const RING_HALO = paint("oklch(0.97 0.006 90)", "#f6f4ef");

const meta = {
  title: "Advanced/Custom D3 layer",
  parameters: {
    docs: {
      description: {
        component:
          "Children of GeoMap/GeoGlobe render in projected space. `useGeo()` exposes the live d3 `projection` and `path`, so any d3-geo generator plugs straight in — here `geoCircle` draws great-circle range rings, something the package has no built-in for.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

function RangeRings({ center, radiiKm }: { center: Coordinate; radiiKm: number[] }) {
  const { path, project, counterScale } = useGeo();
  const centerLonLat: [number, number] = Array.isArray(center)
    ? center
    : [("lng" in center ? center.lng : center.lon), center.lat];
  const [centerLng, centerLat] = centerLonLat;
  return (
    <g className="range-rings" pointerEvents="none">
      {radiiKm.map((km) => {
        // d3-geo's geoCircle takes an angular radius in degrees.
        const radiusDeg = km / 111.32;
        const ring = geoCircle().center(centerLonLat).radius(radiusDeg)();
        // Label each ring where it crosses the meridian due north of center.
        const label = project([centerLng, centerLat + radiusDeg]);
        return (
          <React.Fragment key={km}>
            <path
              data-ring={km}
              d={path(ring) ?? undefined}
              fill="none"
              stroke={RING}
              strokeWidth={1.2}
              strokeDasharray="2 3"
              vectorEffect="non-scaling-stroke"
            />
            {label && (
              <text
                x={label[0]}
                y={label[1] - 3 * counterScale}
                textAnchor="middle"
                fontSize={9 * counterScale}
                fontFamily="system-ui"
                fontWeight={600}
                fill={RING}
                stroke={RING_HALO}
                strokeWidth={3 * counterScale}
                strokeLinejoin="round"
                paintOrder="stroke"
              >
                {km.toLocaleString()} km
              </text>
            )}
          </React.Fragment>
        );
      })}
    </g>
  );
}

export const RangeRingsFromVienna: Story = {
  render: () => (
    <Frame>
      <GeoMap
        preset="light"
        countries={{ data: world }}
        markers={[CITIES[0]!]}
        aria-label="Range rings drawn by a custom d3 layer around Vienna"
      >
        <RangeRings center={CITIES[0]!.coordinates} radiiKm={[1000, 2500, 5000]} />
      </GeoMap>
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelectorAll("[data-ring]").length).toBe(3);
    });
  },
};
