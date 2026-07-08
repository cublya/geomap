import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { GeoView, type GeoViewMode } from "@cublya/geomap";
import "@cublya/geomap/styles.css";
import { CITIES, DemoButton, Frame, Toolbar, world } from "./support";

const meta = {
  title: "View/View",
  parameters: {
    docs: {
      description: {
        component:
          "`GeoView` is one map that flips between the flat `GeoMap` and the orthographic `GeoGlobe`. A segmented `GeoViewToggle` (map | globe) sits top-left and the zoom cluster bottom-right; the geographic centre (and range-scaled zoom) carry across the switch, so flipping stays put. Uncontrolled by default — pass `mode`/`onModeChange` to drive it yourself.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Toggleable: Story = {
  render: () => (
    <Frame>
      <GeoView
        preset="light"
        countries={{ data: world }}
        markers={CITIES.map((c) => ({ ...c, size: 3.5, color: "#131515" }))}
        routes={[{ id: "vie-nbo", stops: [CITIES[0]!.coordinates, CITIES[5]!.coordinates] }]}
        aria-label="Map that toggles to a globe"
      />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvasElement.querySelector("svg.geomap-map")).toBeTruthy());
    await userEvent.click(canvas.getByRole("radio", { name: "Globe" }));
    await waitFor(() => {
      expect(canvasElement.querySelector("svg.geomap-globe")).toBeTruthy();
      expect(canvasElement.querySelector(".geomap-sphere")).toBeTruthy();
    });
    await userEvent.click(canvas.getByRole("radio", { name: "Flat map" }));
    await waitFor(() => expect(canvasElement.querySelector("svg.geomap-map")).toBeTruthy());
  },
};

function ControlledDemo() {
  const [mode, setMode] = React.useState<GeoViewMode>("globe");
  return (
    <Frame>
      <GeoView
        preset="light"
        mode={mode}
        onModeChange={setMode}
        graticule
        countries={{ data: world }}
        aria-label={`${mode} view`}
      />
      <Toolbar corner="top-right">
        <DemoButton active={mode === "map"} onClick={() => setMode("map")}>
          Map
        </DemoButton>
        <DemoButton active={mode === "globe"} onClick={() => setMode("globe")}>
          Globe
        </DemoButton>
      </Toolbar>
    </Frame>
  );
}

export const Controlled: Story = {
  render: () => <ControlledDemo />,
  parameters: {
    docs: {
      description: {
        story:
          "Drive the surface from your own state with `mode` + `onModeChange` — here an external toolbar flips it, and the built-in toggle reports back through the same callback.",
      },
    },
  },
};
