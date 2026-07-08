import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { GeoControls, GeoMap, useMapCamera, useMapView } from "@cublya/geomap";
import type { FitTarget } from "@cublya/geomap";
import "@cublya/geomap/styles.css";
import { ACCENT, CITIES, DemoButton, Frame, Toolbar, world, worldComplete } from "./support";

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
  const frameRef = React.useRef<HTMLDivElement>(null);
  return (
    <Frame ref={frameRef}>
      <GeoMap
        preset="light"
        camera={camera}
        countries={{ data: world }}
        aria-label="Camera playground"
      />
      <Toolbar>
        <DemoButton onClick={() => camera.fitTo(world.get("JP")!)}>Fit Japan</DemoButton>
        <DemoButton onClick={() => camera.fitTo(CITIES.map((c) => c.coordinates))}>
          Fit all cities
        </DemoButton>
        <DemoButton onClick={() => camera.flyTo({ center: [-60, -15], zoom: 3 })}>
          Fly to South America
        </DemoButton>
        <DemoButton onClick={() => camera.panBy(-120, 0)}>Pan east</DemoButton>
      </Toolbar>
      <GeoControls
        camera={camera}
        preset="light"
        fullscreen={frameRef}
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

// The 10m atlas so small nations like Singapore are drawn (and highlightable);
// the 110m atlas omits them entirely. `highlightId` overrides the country the
// fill highlights when the fit target isn't the country itself.
const FIT_REGIONS: { label: string; fit: FitTarget; highlightId?: string }[] = [
  { label: "World", fit: "world" },
  { label: "Brazil", fit: worldComplete.get("BR")! },
  { label: "Japan", fit: worldComplete.get("JP")! },
  { label: "Egypt", fit: worldComplete.get("EG")! },
  // AU's real bounds reach Macquarie Island (~55°S, 159°E), which would frame a
  // huge empty Southern Ocean, so fit the mainland + Tasmania box instead, but
  // still highlight the whole AU shape.
  {
    label: "Australia",
    fit: [
      [112.9, -44],
      [154, -9.5],
    ],
    highlightId: worldComplete.get("AU")!.id,
  },
  { label: "Singapore", fit: worldComplete.get("SG")! },
];

const CURVES = ["arc", "linear"] as const;

function DeclarativeFitDemo() {
  const [region, setRegion] = React.useState(1);
  const [curve, setCurve] = React.useState<(typeof CURVES)[number]>("arc");
  // `fitTo` derives zoom from the target's projected span (zoom =
  // width·coverage / span), so a small country zooms in more than a large one
  // on its own. A generous maxZoom lets tiny nations like Singapore actually
  // reach that zoom instead of being capped at the default 8.
  const camera = useMapCamera({ maxZoom: 120 });
  // A country fit target carries its own id; "world"/bounds don't, so an
  // explicit `highlightId` says what to fill for those.
  const active = FIT_REGIONS[region]!;
  const focused = active.fit;
  const focusedId =
    active.highlightId ??
    (typeof focused === "object" && "id" in focused ? focused.id : null);
  return (
    <Frame>
      <GeoMap
        preset="light"
        camera={camera}
        countries={{
          data: worldComplete,
          fill: (country) => (country.id === focusedId ? ACCENT : undefined),
        }}
        fit={FIT_REGIONS[region]!.fit}
        fitCurve={curve}
        aria-label={`Framed on ${FIT_REGIONS[region]!.label} via the fit prop`}
      />
      <Toolbar>
        {FIT_REGIONS.map((r, i) => (
          <DemoButton key={r.label} active={i === region} onClick={() => setRegion(i)}>
            {r.label}
          </DemoButton>
        ))}
      </Toolbar>
      <Toolbar corner="top-right">
        {CURVES.map((c) => (
          <DemoButton key={c} active={c === curve} onClick={() => setCurve(c)}>
            {c === "arc" ? "Arc" : "Linear"}
          </DemoButton>
        ))}
      </Toolbar>
    </Frame>
  );
}

export const DeclarativeFit: Story = {
  name: "Declarative fit prop",
  render: () => <DeclarativeFitDemo />,
};
