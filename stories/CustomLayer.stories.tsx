import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { geoCircle } from "d3-geo";
import { GeoMap, useGeo, type Coordinate } from "@cublya/geomap";
import { ACCENT_ALT, CITIES, Frame, world } from "./support";

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
  const p = project(center);
  return (
    <g className="range-rings" pointerEvents="none">
      {radiiKm.map((km) => {
        // d3-geo's geoCircle takes an angular radius in degrees.
        const ring = geoCircle().center(centerLonLat).radius(km / 111.32)();
        return (
          <path
            key={km}
            data-ring={km}
            d={path(ring) ?? undefined}
            fill="none"
            stroke={ACCENT_ALT}
            strokeWidth={0.8}
            strokeDasharray="2 3"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      {p && (
        <text
          x={p[0]}
          y={p[1] - 8 * counterScale}
          textAnchor="middle"
          fontSize={9 * counterScale}
          fontFamily="system-ui"
          fill={ACCENT_ALT}
        >
          1000 / 2500 / 5000 km
        </text>
      )}
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
