import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import {
  GeoMap,
  GeoTooltip,
  type CountryHover,
  type PreparedCountry,
} from "@cublya/geomap";
import "@cublya/geomap/styles.css";
import { Frame, scoreFill, mockScore, world } from "./support";

const meta = {
  title: "Maps/Choropleth",
  parameters: {
    docs: {
      description: {
        component:
          "Country choropleths over `prepareCountries()` data. The `fill` callback receives a `PreparedCountry` (full ISO identity); returning `undefined` paints the muted no-data tone.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Basic: Story = {
  render: () => (
    <Frame>
      <GeoMap
        preset="light"
        countries={{ data: world, fill: (c) => scoreFill(c.id) }}
        aria-label="Mock score by country"
      />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      const paths = canvasElement.querySelectorAll("path[data-country]");
      expect(paths.length).toBeGreaterThan(150);
    });
  },
};

function SelectionDemo() {
  const [selected, setSelected] = React.useState<PreparedCountry | null>(null);
  return (
    <Frame>
      <GeoMap
        preset="light"
        countries={{
          data: world,
          fill: (c) => scoreFill(c.id),
          selectedId: selected?.id ?? null,
          onSelect: setSelected,
        }}
        aria-label="Click a country to select it"
      />
      <p aria-live="polite" style={{ position: "absolute", left: 12, top: 4, font: "500 13px system-ui" }}>
        {selected ? `Selected: ${selected.name} (${selected.alpha3})` : "Nothing selected"}
      </p>
    </Frame>
  );
}

export const Selection: Story = {
  render: () => <SelectionDemo />,
  play: async ({ canvasElement }) => {
    const brazil = await waitFor(() => {
      const el = canvasElement.querySelector('path[data-country="br"]');
      expect(el).toBeTruthy();
      return el!;
    });
    await userEvent.click(brazil);
    await waitFor(() => {
      expect(canvasElement.textContent).toContain("Selected: Brazil (BRA)");
      expect(canvasElement.querySelector('path[data-country="br"][data-selected]')).toBeTruthy();
    });
    // Ocean click clears the selection.
    await userEvent.click(canvasElement.querySelector("svg")!);
    await waitFor(() => expect(canvasElement.textContent).toContain("Nothing selected"));
  },
};

const visited = new Set(["fr", "jp", "br", "ke", "ca", "in"]);
const wishlist = new Set(["nz", "is", "pe", "ma"]);

export const Patterns: Story = {
  name: "Patterns (color-blind safe)",
  render: () => (
    <Frame>
      <GeoMap
        preset="light"
        countries={{
          data: world,
          fill: (c) =>
            visited.has(c.id) ? "#7f61d3" : wishlist.has(c.id) ? "#e0a832" : undefined,
          pattern: (c) => (visited.has(c.id) ? "hatch" : wishlist.has(c.id) ? "dots" : undefined),
        }}
        aria-label="Visited (hatched) and wishlist (dotted) countries"
      />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelectorAll(".geomap-pattern").length).toBe(
        visited.size + wishlist.size,
      );
    });
  },
};

function TooltipDemo() {
  const [hover, setHover] = React.useState<CountryHover | null>(null);
  return (
    <Frame>
      <GeoMap
        preset="light"
        countries={{ data: world, fill: (c) => scoreFill(c.id), onHover: setHover }}
        aria-label="Hover a country for its score"
      />
      <GeoTooltip point={hover?.point}>
        {hover && `${hover.country.name} · score ${mockScore(hover.country.id)}`}
      </GeoTooltip>
    </Frame>
  );
}

export const Tooltip: Story = {
  render: () => <TooltipDemo />,
  play: async ({ canvasElement }) => {
    const australia = await waitFor(() => {
      const el = canvasElement.querySelector('path[data-country="au"]');
      expect(el).toBeTruthy();
      return el!;
    });
    await userEvent.hover(australia);
    await waitFor(() => {
      const tip = document.querySelector(".geomap-tooltip");
      expect(tip?.textContent).toContain("Australia");
    });
    await userEvent.unhover(australia);
    await waitFor(() => expect(document.querySelector(".geomap-tooltip")).toBeNull());
  },
};
