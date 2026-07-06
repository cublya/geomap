import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Topology } from "topojson-specification";
import world110 from "world-atlas/countries-110m.json";
import { prepareCountries } from "../core/geodata";
import { createMapCamera } from "../core/camera-map";
import { GeoMap } from "./GeoMap";
import { GeoControls } from "./controls";
import { GeoTooltip } from "./tooltip";

const world = prepareCountries(world110 as unknown as Topology, { exclude: ["AQ"] });

beforeAll(() => {
  let now = 0;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    now += 16;
    cb(now);
    return 0;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

afterEach(cleanup);

describe("GeoControls", () => {
  it("drives any camera and works with no stylesheet", () => {
    const camera = createMapCamera();
    render(<GeoControls camera={camera} />);
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(camera.view.zoom).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole("button", { name: "Reset view" }));
    expect(camera.view.zoom).toBeCloseTo(1, 5);
    expect(screen.getByRole("group", { name: "Map controls" })).toBeTruthy();
  });

  it("accepts custom labels", () => {
    const camera = createMapCamera();
    render(<GeoControls camera={camera} labels={{ zoomIn: "Bigger" }} />);
    expect(screen.getByRole("button", { name: "Bigger" })).toBeTruthy();
  });
});

describe("GeoTooltip", () => {
  it("renders nothing without a point or content", () => {
    const { container, rerender } = render(<GeoTooltip point={null}>hi</GeoTooltip>);
    expect(container.innerHTML).toBe("");
    rerender(<GeoTooltip point={[10, 20]} />);
    expect(container.innerHTML).toBe("");
  });

  it("positions at the given client point with inline styles only", () => {
    render(<GeoTooltip point={[120, 80]}>Japan · 87</GeoTooltip>);
    const tip = screen.getByRole("tooltip");
    expect(tip.style.position).toBe("fixed");
    expect(tip.style.left).toBe("120px");
    expect(tip.style.top).toBe("80px");
    expect(tip.textContent).toBe("Japan · 87");
  });
});

describe("theme modes on GeoMap", () => {
  it("dark mode emits CSS-variable fills with dark fallbacks", () => {
    const { container } = render(<GeoMap countries={{ data: world }} theme="dark" />);
    const de = container.querySelector('path[data-country="de"]')!;
    expect(de.getAttribute("fill")).toMatch(/^var\(--cublya-geo-land, #33383b\)$/);
  });

  it("unstyled mode emits no fill/stroke but keeps stable class names", () => {
    const { container } = render(
      <GeoMap
        countries={{ data: world }}
        theme="unstyled"
        routes={[{ id: "r", stops: [[0, 0], [40, 20]] }]}
        markers={[{ id: "m", coordinates: [10, 50] }]}
        graticule
      />,
    );
    const de = container.querySelector('path[data-country="de"]')!;
    expect(de.getAttribute("fill")).toBeNull();
    expect(de.getAttribute("class")).toBe("cublya-geo-country");
    expect(container.querySelector(".cublya-geo-route")!.getAttribute("stroke")).toBeNull();
    expect(container.querySelector(".cublya-geo-graticule")).toBeTruthy();
    expect(container.querySelector(".cublya-geo-marker")).toBeTruthy();
    expect(container.querySelector("svg")!.getAttribute("class")).toContain("cublya-geo-map");
  });

  it("marks the selected country with a data attribute for CSS targeting", () => {
    const { container } = render(
      <GeoMap countries={{ data: world, selectedId: "jp" }} theme="unstyled" />,
    );
    expect(container.querySelector('path[data-country="jp"][data-selected]')).toBeTruthy();
    expect(container.querySelector(".cublya-geo-selection")).toBeTruthy();
  });
});
