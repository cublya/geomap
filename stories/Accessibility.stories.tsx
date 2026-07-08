import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { GeoGlobe, GeoMap, useMapCamera, useMapView, usePrefersReducedMotion } from "@cublya/geomap";
import { Frame, world } from "./support";

const meta = {
  title: "Accessibility/Accessibility",
  parameters: {
    docs: {
      description: {
        component:
          "The map SVG is `role=\"img\"` with a required label, focusable, and keyboard-operable: arrows pan (map) or rotate (globe), `+`/`-` zoom, `Home`/`0` reset. Every country exposes a native `<title>`. All tweens, inertia and live-object animation honour `prefers-reduced-motion` by jumping to the final state.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

function KeyboardDemo() {
  const camera = useMapCamera();
  const view = useMapView(camera);
  return (
    <Frame>
      <GeoMap
        preset="light"
        camera={camera}
        countries={{ data: world }}
        aria-label="Keyboard-operable map: arrows pan, plus and minus zoom, Home resets"
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

export const KeyboardControls: Story = {
  render: () => <KeyboardDemo />,
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector("svg")!;
    svg.focus();
    expect(document.activeElement).toBe(svg);

    const zoomOf = () => parseFloat(canvasElement.textContent!.match(/zoom ([\d.]+)/)![1]!);
    const centerLonOf = () =>
      parseFloat(canvasElement.textContent!.match(/center (-?[\d.]+)/)![1]!);

    await userEvent.keyboard("{+}");
    await waitFor(() => expect(zoomOf()).toBeGreaterThan(1));

    const lonBefore = centerLonOf();
    await userEvent.keyboard("{ArrowRight}");
    await waitFor(() => expect(centerLonOf()).toBeGreaterThan(lonBefore));

    await userEvent.keyboard("{Home}");
    await waitFor(() => expect(zoomOf()).toBeCloseTo(1, 1));
  },
};

export const KeyboardGlobe: Story = {
  render: () => (
    <Frame>
      <GeoGlobe
        preset="light"
        countries={{ data: world }}
        aria-label="Keyboard-operable globe: arrows rotate, plus and minus zoom, Home resets"
      />
    </Frame>
  ),
};

function ReducedMotionDemo() {
  const reduced = usePrefersReducedMotion();
  return (
    <Frame>
      <GeoGlobe
        preset="light"
        countries={{ data: world }}
        autoRotate={6}
        aria-label="Globe that respects reduced motion"
      />
      <p style={{ position: "absolute", top: 8, left: 12, font: "500 13px system-ui" }}>
        prefers-reduced-motion:{" "}
        <strong>{reduced ? "reduce — animations jump to their target" : "no-preference"}</strong>
        {" "}(toggle it in your OS settings; this globe stops spinning and fly-tos become
        instant)
      </p>
    </Frame>
  );
}

export const ReducedMotion: Story = {
  render: () => <ReducedMotionDemo />,
  parameters: {
    docs: {
      description: {
        story:
          "There is no in-page toggle for `prefers-reduced-motion` — set it at the OS/browser level and this story updates live. The behaviour itself (tweens jumping, inertia and auto-rotate disabled, live objects teleporting) is covered by unit tests and the Playwright suite, which emulates the media query.",
      },
    },
  },
};

export const HoverAnimation: Story = {
  name: "Customizable hover",
  render: () => (
    <Frame>
      <GeoMap
        preset="light"
        countries={{
          data: world,
          // Interactive so the highlight tracks; onSelect is a no-op here.
          onSelect: () => {},
          // Tune the fade: a longer, eased transition of the `landHover` overlay.
          // Pass `hover={false}` for the classic instant highlight; the fade also
          // snaps automatically under prefers-reduced-motion.
          hover: { durationMs: 260, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
        }}
        aria-label="Map whose hover highlight fades in and out"
      />
    </Frame>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "The hover highlight (the translucent `landHover` overlay) fades in and out. Customize it via `countries.hover` — `{ durationMs, easing }` to tune the fade, or `false` to keep it instant. It honours `prefers-reduced-motion` by snapping.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const br = await waitFor(() => {
      const el = canvasElement.querySelector<SVGPathElement>('path[data-country="br"]');
      expect(el).toBeTruthy();
      return el!;
    });
    await userEvent.hover(br);
    await waitFor(() => {
      const overlay = canvasElement.querySelector<SVGPathElement>(".geomap-hover");
      expect(overlay).toBeTruthy();
      expect(overlay!.style.transition).toContain("260ms");
    });
  },
};
