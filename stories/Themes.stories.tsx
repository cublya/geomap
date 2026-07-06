import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { GeoMap } from "@cublya/geo";
import { CITIES, Frame, scoreFill, world } from "./support";

const meta = {
  title: "Theming/Themes",
  parameters: {
    docs: {
      description: {
        component:
          "Four theming modes, none of which require a CSS import: `\"light\"` (default) and `\"dark\"` are complete palettes whose every value is a `var(--cublya-geo-*, fallback)` hook; a partial object customizes over light; `\"unstyled\"` emits no presentation attributes so your CSS owns the stable `cublya-geo-*` class names.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const demoLayers = {
  markers: CITIES.slice(0, 3),
  routes: [
    { id: "r1", stops: [CITIES[0]!.coordinates, CITIES[1]!.coordinates] },
    { id: "r2", stops: [CITIES[0]!.coordinates, CITIES[2]!.coordinates], dashed: true },
  ],
};

export const Light: Story = {
  render: () => (
    <Frame>
      <GeoMap
        countries={{ data: world, fill: (c) => scoreFill(c.id) }}
        {...demoLayers}
        aria-label="Light theme"
      />
    </Frame>
  ),
};

export const Dark: Story = {
  render: () => (
    <Frame dark>
      <GeoMap
        countries={{ data: world }}
        {...demoLayers}
        theme="dark"
        aria-label="Dark theme"
      />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      const country = canvasElement.querySelector("path[data-country]")!;
      expect(country.getAttribute("fill")).toContain("var(--cublya-geo-land");
    });
  },
};

export const Custom: Story = {
  name: "Custom (per-instance overrides)",
  render: () => (
    <Frame>
      <GeoMap
        countries={{ data: world }}
        {...demoLayers}
        theme={{
          land: "#dcefe4",
          landStroke: "rgba(10, 80, 40, 0.25)",
          marker: "#0a5028",
          route: "#0a5028",
          markerLabel: "#0a5028",
        }}
        aria-label="Custom green theme"
      />
    </Frame>
  ),
};

export const CssVariables: Story = {
  name: "Custom (CSS variables)",
  render: () => (
    <Frame>
      {/* Any ancestor can retheme every map inside it — no props needed. */}
      <div style={
        {
          height: "100%",
          "--cublya-geo-land": "#f3d9c4",
          "--cublya-geo-marker": "#8a3800",
          "--cublya-geo-route": "#8a3800",
          "--cublya-geo-marker-label": "#8a3800",
        } as React.CSSProperties
      }>
        <GeoMap
          countries={{ data: world }}
          {...demoLayers}
          aria-label="Themed via --cublya-geo-* CSS variables"
        />
      </div>
    </Frame>
  ),
};

const UNSTYLED_CSS = `
  .unstyled-demo .cublya-geo-country { fill: #ece9f8; stroke: #fff; stroke-width: 0.6; }
  .unstyled-demo .cublya-geo-country:hover { fill: #cfc4f0; }
  .unstyled-demo .cublya-geo-country[data-selected] { fill: #7f61d3; }
  .unstyled-demo .cublya-geo-route { stroke: #5636b8; stroke-width: 1.4; fill: none; }
  .unstyled-demo .cublya-geo-marker circle { fill: #5636b8; }
  .unstyled-demo .cublya-geo-label { fill: #2b1a66; font: 600 9px system-ui; }
`;

function UnstyledDemo() {
  const [selectedId, setSelectedId] = React.useState<string | null>("jp");
  return (
    <Frame>
      {/* Story-only CSS — the package ships none of this. */}
      <style>{UNSTYLED_CSS}</style>
      <div className="unstyled-demo" style={{ height: "100%" }}>
        <GeoMap
          countries={{
            data: world,
            selectedId,
            onSelect: (c) => setSelectedId(c?.id ?? null),
          }}
          {...demoLayers}
          theme="unstyled"
          aria-label="Unstyled mode, painted entirely by host CSS"
        />
      </div>
    </Frame>
  );
}

export const Unstyled: Story = {
  render: () => <UnstyledDemo />,
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      const country = canvasElement.querySelector("path[data-country]")!;
      // The package emitted no fill — the story stylesheet owns everything.
      expect(country.getAttribute("fill")).toBeNull();
    });
  },
};
