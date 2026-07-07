import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { GeoControls, GeoMap, useMapCamera, useMapView } from "@cublya/geo";
import "@cublya/geo/styles.css";
import { CITIES, Frame, scoreFill, world } from "./support";

const meta = {
  title: "Camera/Camera",
  parameters: {
    docs: {
      description: {
        component:
          "The camera is a small store from `useMapCamera()`: fly-to, fit-to (country / coordinates / world), pan, zoom and reset — plus drag, wheel-at-cursor and pinch on the map itself. `GeoControls` is the optional button cluster (styled by the optional stylesheet).",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

function CameraDemo() {
  const camera = useMapCamera({ maxZoom: 8 });
  const view = useMapView(camera);
  return (
    <Frame>
      <GeoMap
        preset="light"
        camera={camera}
        countries={{ data: world, fill: (c) => scoreFill(c.id) }}
        aria-label="Camera playground"
      />
      <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 8 }}>
        <button type="button" onClick={() => camera.fitTo(world.get("JP")!)}>
          Fit Japan
        </button>
        <button type="button" onClick={() => camera.fitTo(CITIES.map((c) => c.coordinates))}>
          Fit all cities
        </button>
        <button type="button" onClick={() => camera.flyTo({ center: [-60, -15], zoom: 3 })}>
          Fly to South America
        </button>
        <button type="button" onClick={() => camera.panBy(-120, 0)}>
          Pan east
        </button>
      </div>
      <GeoControls
        camera={camera}
        style={{ position: "absolute", bottom: 16, right: 16 }}
      />
      <p
        aria-live="polite"
        style={{ position: "absolute", bottom: 12, left: 12, font: "500 12px system-ui" }}
      >
        zoom {view.zoom.toFixed(2)} · center {view.center[0].toFixed(1)},{" "}
        {view.center[1].toFixed(1)}
      </p>
    </Frame>
  );
}

export const Interactive: Story = {
  render: () => <CameraDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: "Fit Japan" }));
    await waitFor(() => {
      const zoom = parseFloat(canvasElement.textContent!.match(/zoom ([\d.]+)/)![1]!);
      expect(zoom).toBeGreaterThan(1.5);
    });

    await userEvent.click(canvas.getByRole("button", { name: "Zoom in" }));
    const zoomAfterFit = () =>
      parseFloat(canvasElement.textContent!.match(/zoom ([\d.]+)/)![1]!);
    await waitFor(() => expect(zoomAfterFit()).toBeGreaterThan(2));

    await userEvent.click(canvas.getByRole("button", { name: "Reset view" }));
    await waitFor(() => expect(zoomAfterFit()).toBeCloseTo(1, 1));
  },
};

export const DeclarativeFit: Story = {
  name: "Declarative fit prop",
  render: () => (
    <Frame>
      <GeoMap
        preset="light"
        countries={{ data: world, fill: (c) => scoreFill(c.id) }}
        fit={world.get("BR")!}
        aria-label="Framed on Brazil via the fit prop"
      />
    </Frame>
  ),
};
