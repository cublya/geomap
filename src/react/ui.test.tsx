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
  it("defaults to preset none: bare buttons with no inline presentation styles", () => {
    const camera = createMapCamera();
    render(<GeoControls camera={camera} />);
    const button = screen.getByRole("button", { name: "Zoom in" });
    expect(button.getAttribute("style")).toBeNull();
  });

  it("drives any camera and works with no stylesheet", () => {
    const camera = createMapCamera();
    render(<GeoControls camera={camera} preset="light" />);
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(camera.view.zoom).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole("button", { name: "Reset view" }));
    expect(camera.view.zoom).toBeCloseTo(1, 5);
    expect(screen.getByRole("group", { name: "Map controls" })).toBeTruthy();
  });

  it("preset styling is complete without any CSS import", () => {
    const camera = createMapCamera();
    render(<GeoControls camera={camera} preset="light" />);
    const button = screen.getByRole("button", { name: "Zoom in" });
    expect(button.style.background).toContain("--geo-control-bg");
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

  it("defaults to preset none: positioned, but no surface styling", () => {
    render(<GeoTooltip point={[0, 0]}>hi</GeoTooltip>);
    const tip = screen.getByRole("tooltip");
    expect(tip.style.background).toBe("");
  });

  it('preset="light" adds a complete surface (background/ink/border) without CSS', () => {
    render(
      <GeoTooltip point={[0, 0]} preset="light">
        hi
      </GeoTooltip>,
    );
    const tip = screen.getByRole("tooltip");
    expect(tip.style.background).toContain("--geo-tooltip-bg");
  });
});

describe("presets on GeoMap", () => {
  it("defaults to preset none: no fill/stroke/background without opting in", () => {
    const { container } = render(<GeoMap countries={{ data: world }} />);
    const de = container.querySelector('path[data-country="de"]')!;
    expect(de.getAttribute("fill")).toBeNull();
    const svg = container.querySelector("svg")!;
    expect(svg.style.background).toBe("");
  });

  it('preset="light" looks complete: fills land and ocean out of the box', () => {
    const { container } = render(<GeoMap countries={{ data: world }} preset="light" />);
    const de = container.querySelector('path[data-country="de"]')!;
    expect(de.getAttribute("fill")).toMatch(/^var\(--geo-land, oklch\(.+\)\)$/);
    const svg = container.querySelector("svg")!;
    expect(svg.style.background).toContain("--geo-ocean");
  });

  it("dark preset emits CSS-variable fills with dark OKLCH fallbacks", () => {
    const { container } = render(<GeoMap countries={{ data: world }} preset="dark" />);
    const de = container.querySelector('path[data-country="de"]')!;
    expect(de.getAttribute("fill")).toBe("var(--geo-land, oklch(0.33 0.008 250))");
  });

  it("theme overrides win over the preset (precedence step 3)", () => {
    const { container } = render(
      <GeoMap countries={{ data: world }} preset="dark" theme={{ land: "rebeccapurple" }} />,
    );
    const de = container.querySelector('path[data-country="de"]')!;
    expect(de.getAttribute("fill")).toBe("rebeccapurple");
  });

  it("fill callbacks win over theme overrides (precedence step 4)", () => {
    const { container } = render(
      <GeoMap
        countries={{ data: world, fill: (c) => (c.id === "de" ? "tomato" : undefined) }}
        theme={{ land: "rebeccapurple" }}
      />,
    );
    expect(container.querySelector('path[data-country="de"]')!.getAttribute("fill")).toBe(
      "tomato",
    );
  });

  it("preset none emits no fill/stroke but keeps stable class names", () => {
    const { container } = render(
      <GeoMap
        countries={{ data: world }}
        preset="none"
        routes={[{ id: "r", stops: [[0, 0], [40, 20]] }]}
        markers={[{ id: "m", coordinates: [10, 50] }]}
        graticule
      />,
    );
    const de = container.querySelector('path[data-country="de"]')!;
    expect(de.getAttribute("fill")).toBeNull();
    expect(de.getAttribute("class")).toBe("geo-country");
    expect(container.querySelector(".geo-route")!.getAttribute("stroke")).toBeNull();
    expect(container.querySelector(".geo-graticule")).toBeTruthy();
    expect(container.querySelector(".geo-marker")).toBeTruthy();
    expect(container.querySelector("svg")!.getAttribute("class")).toContain("geo-map");
  });

  it("marks the selected country with a data attribute for CSS targeting", () => {
    const { container } = render(
      <GeoMap countries={{ data: world, selectedId: "jp" }} preset="none" />,
    );
    expect(container.querySelector('path[data-country="jp"][data-selected]')).toBeTruthy();
    expect(container.querySelector(".geo-selection")).toBeTruthy();
  });

  it("disabled countries are dimmed and inert", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <GeoMap
        preset="light"
        countries={{ data: world, onSelect, disabled: (c) => c.id === "fr" }}
      />,
    );
    const fr = container.querySelector('path[data-country="fr"]')!;
    expect(fr.getAttribute("data-disabled")).toBe("");
    expect(fr.getAttribute("fill")).toContain("--geo-land-disabled");
    fireEvent.click(fr);
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(container.querySelector('path[data-country="de"]')!);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("hovering an interactive country paints the landHover overlay (styled presets)", () => {
    const { container } = render(
      <GeoMap preset="light" countries={{ data: world, onSelect: () => {} }} />,
    );
    const br = container.querySelector('path[data-country="br"]')!;
    fireEvent.pointerEnter(br, { clientX: 10, clientY: 10 });
    const overlay = container.querySelector(".geo-hover");
    expect(overlay).toBeTruthy();
    expect(overlay!.getAttribute("fill")).toContain("--geo-land-hover");
    fireEvent.pointerLeave(br);
    expect(container.querySelector(".geo-hover")).toBeNull();
  });

  it("preset none skips the hover overlay entirely (no landHover token)", () => {
    const { container } = render(
      <GeoMap countries={{ data: world, onSelect: () => {} }} />,
    );
    const br = container.querySelector('path[data-country="br"]')!;
    fireEvent.pointerEnter(br, { clientX: 10, clientY: 10 });
    expect(container.querySelector(".geo-hover")).toBeNull();
  });
});
