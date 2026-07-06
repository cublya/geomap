import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import {
  GeoMap,
  interpolateGreatCircle,
  bearingBetween,
  type GeoMarker,
  type GeoRoute,
  type LiveObject,
} from "@cublya/geo";
import { Frame, scoreFill, worldDetailed } from "./support";

const meta = {
  title: "Advanced/Performance stress",
  parameters: {
    docs: {
      description: {
        component:
          "A deliberately heavy scene: the 50m atlas (~4× the polygon detail), 400 markers, 60 multi-point routes and 24 live objects updating every second — all SVG. Pan/zoom stays usable because country paths are only recomputed when the projection changes, but this is the scale where the planned Canvas renderer becomes the right tool. Known limits: no marker clustering or label collision handling yet.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// Deterministic pseudo-random points (no Math.random → stable screenshots/tests).
function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry(42);
const point = (): [number, number] => [rand() * 340 - 170, rand() * 130 - 55];

const MARKERS: GeoMarker[] = Array.from({ length: 400 }, (_, i) => ({
  id: `m${i}`,
  coordinates: point(),
  size: 1.6,
  color: "#5636b8",
}));

const ROUTES: GeoRoute[] = Array.from({ length: 60 }, (_, i) => ({
  id: `r${i}`,
  stops: [point(), point(), point()],
  opacity: 0.25,
  width: 0.8,
}));

const FLEET = Array.from({ length: 24 }, (_, i) => ({
  id: `live${i}`,
  from: point(),
  to: point(),
}));

function StressDemo() {
  const [tick, setTick] = React.useState(0);
  const [renderMs, setRenderMs] = React.useState<number | null>(null);
  React.useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  React.useEffect(() => {
    const start = performance.now();
    const raf = requestAnimationFrame(() => setRenderMs(performance.now() - start));
    return () => cancelAnimationFrame(raf);
  }, [tick]);

  const objects: LiveObject[] = FLEET.map((f) => {
    const k = (tick % 60) / 60;
    const position = interpolateGreatCircle(f.from, f.to, k);
    const ahead = interpolateGreatCircle(f.from, f.to, Math.min(1, k + 0.02));
    return { id: f.id, coordinates: position, heading: bearingBetween(position, ahead) };
  });

  return (
    <Frame height={560}>
      <GeoMap
        countries={{ data: worldDetailed, fill: (c) => scoreFill(c.id) }}
        markers={MARKERS}
        routes={ROUTES}
        live={{ objects, transitionMs: 1000 }}
        aria-label="Stress scene with hundreds of layered elements"
      />
      <p style={{ position: "absolute", top: 8, left: 12, font: "500 12px system-ui" }}>
        {worldDetailed.countries.length} countries (50m) · {MARKERS.length} markers ·{" "}
        {ROUTES.length} routes · {FLEET.length} live
        {renderMs != null && ` · last update flushed in ${renderMs.toFixed(0)} ms`}
      </p>
    </Frame>
  );
}

export const Stress: Story = {
  render: () => <StressDemo />,
  play: async ({ canvasElement }) => {
    await waitFor(
      () => {
        expect(canvasElement.querySelectorAll("path[data-country]").length).toBeGreaterThan(200);
        expect(canvasElement.querySelectorAll(".cublya-geo-marker").length).toBe(400);
        expect(canvasElement.querySelectorAll(".cublya-geo-live").length).toBe(24);
      },
      { timeout: 10000 },
    );
  },
};
