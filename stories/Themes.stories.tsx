import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { GeoMap, presets } from "@cublya/geomap";
import { CITIES, Frame, scoreFill, world } from "./support";

const meta = {
  title: "Theming/Presets",
  parameters: {
    docs: {
      description: {
        component:
          "Built-in visual presets let components look complete with zero CSS imports — but CSS stays fully optional, so the package defaults to `preset=\"none\"` (nothing painted; you own every pixel via the semantic class names). Pass `preset=\"light\"`, `\"dark\"` or `\"minimal\"` to opt into a complete out-of-the-box look; `theme` overlays partial tokens on top, and `--geomap-*` CSS variables override globally. Precedence: defaults (none) → preset → theme → feature callbacks → element props.",
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
        preset="light"
        countries={{ data: world, onSelect: () => {} }}
        {...demoLayers}
        aria-label="Light preset"
      />
    </Frame>
  ),
};

export const Dark: Story = {
  render: () => (
    <Frame dark>
      <GeoMap
        countries={{ data: world, onSelect: () => {} }}
        {...demoLayers}
        preset="dark"
        aria-label="Dark preset"
      />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      const country = canvasElement.querySelector("path[data-country]")!;
      expect(country.getAttribute("fill")).toContain("var(--geomap-land");
    });
  },
};

export const Minimal: Story = {
  render: () => (
    <Frame>
      <GeoMap
        countries={{ data: world, onSelect: () => {} }}
        {...demoLayers}
        preset="minimal"
        aria-label="Minimal line-art preset"
      />
    </Frame>
  ),
};

export const CustomTokens: Story = {
  name: "Custom (theme overrides)",
  render: () => (
    <Frame>
      <GeoMap
        countries={{ data: world, fill: (c) => scoreFill(c.id) }}
        {...demoLayers}
        preset="light"
        theme={{
          ocean: "oklch(0.97 0.01 200)",
          landStroke: "oklch(0.3 0.03 200 / 0.3)",
          marker: "oklch(0.45 0.1 200)",
          route: "oklch(0.45 0.1 200)",
          markerLabel: "oklch(0.35 0.05 200)",
        }}
        aria-label="Custom tokens over the light preset, with a choropleth callback on top"
      />
    </Frame>
  ),
};

export const ComposedPreset: Story = {
  name: "Custom (composing preset objects)",
  render: () => (
    <Frame dark>
      <GeoMap
        countries={{ data: world, onSelect: () => {} }}
        {...demoLayers}
        // Exported preset objects compose: start from dark, swap accents.
        theme={{ ...presets.dark, route: "oklch(0.8 0.1 150)", marker: "oklch(0.8 0.1 150)" }}
        aria-label="Dark preset composed with green accents"
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
          "--geomap-land": "oklch(0.9 0.04 80)",
          "--geomap-marker": "oklch(0.45 0.12 60)",
          "--geomap-route": "oklch(0.45 0.12 60)",
          "--geomap-marker-label": "oklch(0.4 0.08 60)",
        } as React.CSSProperties
      }>
        <GeoMap
          countries={{ data: world, onSelect: () => {} }}
          {...demoLayers}
          aria-label="Themed via --geomap-* CSS variables"
        />
      </div>
    </Frame>
  ),
};

const UNSTYLED_CSS = `
  .unstyled-demo .geomap-country { fill: oklch(0.93 0.02 300); stroke: oklch(0.99 0 0); stroke-width: 0.6; }
  .unstyled-demo .geomap-country:hover { fill: oklch(0.82 0.06 300); }
  .unstyled-demo .geomap-country[data-selected] { fill: oklch(0.6 0.15 300); }
  .unstyled-demo .geomap-route { stroke: oklch(0.45 0.18 300); stroke-width: 1.4; fill: none; }
  .unstyled-demo .geomap-marker circle { fill: oklch(0.45 0.18 300); }
  .unstyled-demo .geomap-label { fill: oklch(0.3 0.1 300); font: 600 9px system-ui; }
  .unstyled-demo svg:focus-visible { outline: 2px solid oklch(0.55 0.17 255); }
`;

function NoneDemo() {
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
          preset="none"
          aria-label="Preset none: painted entirely by host CSS"
        />
      </div>
    </Frame>
  );
}

export const None: Story = {
  name: "None (the default)",
  render: () => <NoneDemo />,
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      const country = canvasElement.querySelector("path[data-country]")!;
      // The package emitted no fill — the story stylesheet owns everything.
      expect(country.getAttribute("fill")).toBeNull();
    });
  },
};
