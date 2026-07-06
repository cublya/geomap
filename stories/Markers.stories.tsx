import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { GeoMap, type GeoMarker } from "@cublya/geo";
import { CITIES, Frame, world } from "./support";

const meta = {
  title: "Layers/Markers",
  parameters: {
    docs: {
      description: {
        component:
          "City, airport, or arbitrary-coordinate markers. Sizes counter-scale under zoom so pins stay screen-constant; `renderMarker` swaps in any SVG.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Cities: Story = {
  render: () => (
    <Frame>
      <GeoMap
        countries={{ data: world }}
        markers={CITIES.map((c) => ({ ...c, kind: "city", size: 3, color: "#5636b8" }))}
        aria-label="Six world cities"
      />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelectorAll(".cublya-geo-marker").length).toBe(CITIES.length);
      expect(canvasElement.textContent).toContain("Tokyo");
    });
  },
};

const AIRPORTS: GeoMarker[] = [
  { id: "vie", coordinates: { lat: 48.11, lng: 16.57 }, label: "VIE", kind: "airport" },
  { id: "jfk", coordinates: { lat: 40.64, lng: -73.78 }, label: "JFK", kind: "airport" },
  { id: "hnd", coordinates: { lat: 35.55, lng: 139.78 }, label: "HND", kind: "airport" },
];

function CustomMarkerDemo() {
  const [picked, setPicked] = React.useState<string | null>(null);
  return (
    <Frame>
      <GeoMap
        countries={{ data: world }}
        markers={AIRPORTS}
        onMarkerClick={(m) => setPicked(m.label ?? m.id)}
        renderMarker={(marker, { counterScale }) => (
          <g>
            {/* A diamond "airport" glyph instead of the default disc. */}
            <rect
              x={-4 * counterScale}
              y={-4 * counterScale}
              width={8 * counterScale}
              height={8 * counterScale}
              transform="rotate(45)"
              fill="#b03a20"
              stroke="#fff"
              strokeWidth={counterScale}
            />
            <text
              x={7 * counterScale}
              y={3 * counterScale}
              fontSize={9 * counterScale}
              fontFamily="system-ui"
            >
              {marker.label}
            </text>
          </g>
        )}
        aria-label="Airports with custom diamond markers"
      />
      <p aria-live="polite" style={{ position: "absolute", left: 12, top: 4, font: "500 13px system-ui" }}>
        {picked ? `Clicked ${picked}` : "Click an airport"}
      </p>
    </Frame>
  );
}

export const CustomMarkers: Story = {
  render: () => <CustomMarkerDemo />,
  play: async ({ canvasElement }) => {
    const marker = await waitFor(() => {
      const el = canvasElement.querySelector(".cublya-geo-marker");
      expect(el).toBeTruthy();
      return el!;
    });
    await userEvent.click(marker.querySelector("rect")!);
    await waitFor(() => expect(canvasElement.textContent).toContain("Clicked"));
  },
};
