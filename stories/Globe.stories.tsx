import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { GeoControls, GeoGlobe, useGlobeCamera } from "@cublya/geo";
import "@cublya/geo/styles.css";
import { CITIES, Frame, scoreFill, world } from "./support";

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
        countries={{ data: world, fill: (c) => scoreFill(c.id) }}
        aria-label="Drag to rotate the globe"
      />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.querySelector(".cublya-geo-sphere")).toBeTruthy();
      const visible = canvasElement.querySelectorAll("path[data-country]").length;
      expect(visible).toBeGreaterThan(20);
      expect(visible).toBeLessThan(world.countries.length); // far side clipped
    });
  },
};

function FocusDemo() {
  const camera = useGlobeCamera();
  return (
    <Frame>
      <GeoGlobe
        camera={camera}
        countries={{ data: world, fill: (c) => scoreFill(c.id) }}
        markers={CITIES.map((c) => ({ ...c, size: 3.5, color: "#131515" }))}
        routes={[
          { id: "vie-nbo", stops: [CITIES[0]!.coordinates, CITIES[5]!.coordinates] },
        ]}
        aria-label="Globe with city markers"
      />
      <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 8 }}>
        {CITIES.slice(0, 4).map((city) => (
          <button key={city.id} type="button" onClick={() => camera.focus(city.coordinates)}>
            {city.label}
          </button>
        ))}
      </div>
      <GeoControls camera={camera} style={{ position: "absolute", bottom: 16, right: 16 }} />
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
        const labels = [...canvasElement.querySelectorAll(".cublya-geo-label")].map(
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
        countries={{ data: world, fill: (c) => scoreFill(c.id) }}
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
