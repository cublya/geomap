import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { GeoControls, GeoGlobe, GeoView, useGlobeCamera } from "@cublya/geomap";
import "@cublya/geomap/styles.css";
import { CITIES, DemoButton, Frame, Toolbar, world } from "./support";

const meta = {
  title: "Globe/Globe",
  parameters: {
    docs: {
      description: {
        component:
          "Rotatable orthographic globe: drag to spin (with inertia), wheel/pinch to zoom, arrows rotate when focused. Markers and routes on the far hemisphere are culled automatically.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Rotatable: Story = {
  render: () => (
    <Frame>
      <GeoGlobe
        preset="light"
        countries={{ data: world }}
        aria-label="Drag to rotate the globe"
      />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector(".geomap-sphere")).toBeTruthy();
      const visible = canvasElement.querySelectorAll("path[data-country]").length;
      expect(visible).toBeGreaterThan(20);
      expect(visible).toBeLessThan(world.countries.length); // far side clipped
    });
  },
};

function FocusDemo() {
  const camera = useGlobeCamera();
  const frameRef = React.useRef<HTMLDivElement>(null);
  return (
    <Frame ref={frameRef}>
      <GeoGlobe
        preset="light"
        camera={camera}
        countries={{ data: world }}
        markers={CITIES.map((c) => ({ ...c, size: 3.5, color: "#131515" }))}
        routes={[
          { id: "vie-nbo", stops: [CITIES[0]!.coordinates, CITIES[5]!.coordinates] },
        ]}
        aria-label="Globe with city markers"
      />
      <Toolbar>
        {CITIES.slice(0, 4).map((city) => (
          <DemoButton key={city.id} onClick={() => camera.focus(city.coordinates)}>
            {city.label}
          </DemoButton>
        ))}
      </Toolbar>
      <GeoControls
        camera={camera}
        preset="light"
        fullscreen={frameRef}
        style={{ position: "absolute", bottom: 16, right: 16 }}
      />
    </Frame>
  );
}

export const FocusAndMarkers: Story = {
  render: () => <FocusDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Tokyo starts on the far hemisphere (default rotation faces the Atlantic).
    await waitFor(() => expect(canvasElement.textContent).not.toContain("Tokyo…"));
    await userEvent.click(canvas.getByRole("button", { name: "Tokyo" }));
    await waitFor(
      () => {
        const labels = [...canvasElement.querySelectorAll(".geomap-label")].map(
          (l) => l.textContent,
        );
        expect(labels).toContain("Tokyo");
      },
      { timeout: 3000 },
    );
  },
};

export const AutoRotate: Story = {
  render: () => (
    <Frame>
      <GeoGlobe
        preset="light"
        countries={{ data: world }}
        autoRotate={6}
        aria-label="Slowly spinning globe"
      />
    </Frame>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Idle spin in degrees per second. It pauses while the user drags and is disabled entirely under `prefers-reduced-motion`.",
      },
    },
  },
};

function SwitchToMapDemo() {
  const frameRef = React.useRef<HTMLDivElement>(null);
  return (
    <Frame ref={frameRef}>
      <GeoView
        preset="light"
        defaultMode="globe"
        countries={{ data: world }}
        markers={CITIES.map((c) => ({ ...c, size: 3.5, color: "#131515" }))}
        routes={[{ id: "vie-nbo", stops: [CITIES[0]!.coordinates, CITIES[5]!.coordinates] }]}
        controls={{ fullscreen: frameRef }}
        aria-label="Globe that flips to a flat map"
      />
    </Frame>
  );
}

export const SwitchToMap: Story = {
  render: () => <SwitchToMapDemo />,
  parameters: {
    docs: {
      description: {
        story:
          "`GeoView` wraps the globe and the flat map behind one surface: a segmented map⇄globe toggle sits top-left, and the geographic centre carries across the switch so it stays put. See the **View** section for the controlled variant.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvasElement.querySelector(".geomap-sphere")).toBeTruthy());
    await userEvent.click(canvas.getByRole("radio", { name: "Flat map" }));
    await waitFor(() => {
      expect(canvasElement.querySelector("svg.geomap-map")).toBeTruthy();
      expect(canvasElement.querySelector(".geomap-sphere")).toBeNull();
    });
    await userEvent.click(canvas.getByRole("radio", { name: "Globe" }));
    await waitFor(() => expect(canvasElement.querySelector(".geomap-sphere")).toBeTruthy());
  },
};
