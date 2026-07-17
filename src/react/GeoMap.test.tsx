import { beforeAll, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach } from "vitest";
import type { Topology } from "topojson-specification";
import world110 from "@cublya/world-atlas/countries-110m.json";
import { prepareCountries } from "../core/geodata";
import { createMapCamera } from "../core/camera-map";
import { createFlatProjection } from "../core/projections";
import { GeoMap } from "./GeoMap";
import { useGeo } from "./geo-context";

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

describe("GeoMap", () => {
  it("renders an accessible SVG with one path per country", () => {
    const { container } = render(
      <GeoMap countries={{ data: world }} aria-label="World map" />,
    );
    const svg = screen.getByRole("img", { name: "World map" });
    expect(svg.tagName.toLowerCase()).toBe("svg");
    expect(svg.getAttribute("tabindex")).toBe("0");
    const paths = container.querySelectorAll("path[data-country]");
    expect(paths.length).toBe(world.countries.length);
  });

  it("renders a Canvas surface when requested", () => {
    const { container } = render(
      <GeoMap renderer="canvas" countries={{ data: world }} aria-label="Canvas map" />,
    );
    const canvas = screen.getByRole("img", { name: "Canvas map" });
    expect(canvas.tagName.toLowerCase()).toBe("canvas");
    expect(canvas.getAttribute("tabindex")).toBe("0");
    expect(container.querySelector("svg.geomap-map")).toBeNull();
  });

  it("fills countries via the callback and falls back to the muted tone", () => {
    const { container } = render(
      <GeoMap
        countries={{
          data: world,
          fill: (c) => (c.id === "de" ? "#123456" : undefined),
        }}
      />,
    );
    const de = container.querySelector('path[data-country="de"]');
    expect(de?.getAttribute("fill")).toBe("#123456");
    const fr = container.querySelector('path[data-country="fr"]');
    expect(fr?.getAttribute("fill")).not.toBe("#123456");
  });

  it("reports selection on country click and null on ocean click", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <GeoMap countries={{ data: world, onSelect }} aria-label="map" />,
    );
    fireEvent.click(container.querySelector('path[data-country="jp"]')!);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0]![0]!.alpha2).toBe("JP");

    fireEvent.click(screen.getByRole("img", { name: "map" }));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it("reports hover with client coordinates", () => {
    const onHover = vi.fn();
    const { container } = render(<GeoMap countries={{ data: world, onHover }} />);
    const br = container.querySelector('path[data-country="br"]')!;
    fireEvent.pointerEnter(br, { clientX: 12, clientY: 34 });
    expect(onHover).toHaveBeenCalledWith(
      expect.objectContaining({ point: [12, 34] }),
    );
    fireEvent.pointerLeave(br);
    expect(onHover).toHaveBeenLastCalledWith(null);
  });

  it("emits a native <title> by default but drops it under onHover", () => {
    const plain = render(<GeoMap countries={{ data: world }} />);
    expect(plain.container.querySelector('path[data-country="br"] title')).toBeTruthy();
    plain.unmount();

    // A custom tooltip (onHover) suppresses the native one so they don't double up.
    const hovered = render(<GeoMap countries={{ data: world, onHover: () => {} }} />);
    expect(hovered.container.querySelector('path[data-country="br"] title')).toBeNull();
    hovered.unmount();

    // Explicit nativeTitle always wins.
    const forced = render(
      <GeoMap countries={{ data: world, onHover: () => {}, nativeTitle: true }} />,
    );
    expect(forced.container.querySelector('path[data-country="br"] title')).toBeTruthy();
  });

  it("zooms with keyboard controls through a shared camera", () => {
    const camera = createMapCamera();
    render(<GeoMap countries={{ data: world }} camera={camera} aria-label="map" />);
    const svg = screen.getByRole("img", { name: "map" });
    fireEvent.keyDown(svg, { key: "+" });
    expect(camera.view.zoom).toBeGreaterThan(1);
    fireEvent.keyDown(svg, { key: "Home" });
    expect(camera.view.zoom).toBeCloseTo(1, 5);
  });

  it("applies the declarative fit prop", () => {
    const camera = createMapCamera();
    render(
      <GeoMap
        countries={{ data: world }}
        camera={camera}
        fit={world.get("JP")!}
      />,
    );
    expect(camera.view.zoom).toBeGreaterThan(1);
    // Camera centred near Japan.
    expect(camera.view.center[0]).toBeGreaterThan(125);
    expect(camera.view.center[0]).toBeLessThan(155);
  });

  it("renders markers, routes and custom layers with useGeo", () => {
    function CrossHair() {
      const { project } = useGeo();
      const p = project({ lat: 48.8566, lng: 2.3522 })!;
      return <circle data-testid="custom" cx={p[0]} cy={p[1]} r={2} />;
    }
    const { container, getByTestId } = render(
      <GeoMap
        countries={{ data: world }}
        markers={[{ id: "par", coordinates: { lat: 48.8566, lng: 2.3522 }, label: "Paris" }]}
        routes={[{ id: "r", stops: [{ lat: 48.8566, lng: 2.3522 }, { lat: 35.68, lng: 139.69 }] }]}
      >
        <CrossHair />
      </GeoMap>,
    );
    expect(getByTestId("custom")).toBeTruthy();
    expect(container.textContent).toContain("Paris");
    const route = [...container.querySelectorAll("path")].some(
      (p) => p.getAttribute("stroke-linecap") === "round",
    );
    expect(route).toBe(true);
  });

  it("renders straight and bowed routes in projected screen space", () => {
    const { container } = render(
      <GeoMap
        routes={[
          { id: "straight", stops: [[0, 0], [40, 20]], geometry: "straight" },
          { id: "arc", stops: [[0, 0], [40, 20]], arc: 0.25 },
        ]}
      />,
    );
    const routes = container.querySelectorAll(".geomap-route");
    expect(routes[0]?.getAttribute("d")).toMatch(/^M[^LQ]+L[^LQ]+$/);
    expect(routes[1]?.getAttribute("d")).toMatch(/^M[^LQ]+Q[^LQ]+$/);
  });

  it("renders selected marker rings and lets per-marker strokes override the halo", () => {
    const { container } = render(
      <GeoMap
        preset="light"
        theme={{ halo: "halo", markerSelected: "selected" }}
        markers={[
          { id: "selected", coordinates: [0, 0], size: 5, selected: true, stroke: "marker-stroke", strokeWidth: 2 },
          { id: "unselected", coordinates: [10, 0], selected: true },
        ]}
      />,
    );
    const rings = container.querySelectorAll(".geomap-marker-selection");
    expect(rings).toHaveLength(2);
    expect(rings[0]?.getAttribute("r")).toBe("9");
    const dot = rings[0]?.nextElementSibling;
    expect(dot?.getAttribute("stroke")).toBe("marker-stroke");
    expect(dot?.getAttribute("stroke-width")).toBe("2");
  });

  it("only renders selected marker rings when both marker selection and token are present", () => {
    const { container } = render(
      <GeoMap
        theme={{ markerSelected: "selected" }}
        markers={[
          { id: "selected", coordinates: [0, 0], selected: true },
          { id: "plain", coordinates: [10, 0] },
        ]}
      />,
    );
    expect(container.querySelectorAll(".geomap-marker-selection")).toHaveLength(1);
  });

  it("does not render selected marker rings without the markerSelected token", () => {
    const { container } = render(
      <GeoMap markers={[{ id: "selected", coordinates: [0, 0], selected: true }]} />,
    );
    expect(container.querySelector(".geomap-marker-selection")).toBeNull();
  });

  it("hides visible marker labels while preserving SVG title hover text", () => {
    const { container } = render(
      <GeoMap
        showMarkerLabels={false}
        markers={[{ id: "labelled", coordinates: [0, 0], label: "Hover label" }]}
      />,
    );
    expect(container.querySelector(".geomap-marker text")).toBeNull();
    expect(container.querySelector(".geomap-marker title")?.textContent).toBe("Hover label");
  });

  it("keeps custom React layers available over the Canvas renderer", () => {
    function CrossHair() {
      const { project } = useGeo();
      const p = project({ lat: 48.8566, lng: 2.3522 })!;
      return <circle data-testid="custom-canvas-layer" cx={p[0]} cy={p[1]} r={2} />;
    }
    const { container } = render(
      <GeoMap renderer="canvas" countries={{ data: world }}>
        <CrossHair />
      </GeoMap>,
    );
    expect(screen.getByTestId("custom-canvas-layer")).toBeTruthy();
    // Custom layers project into viewBox space, so the overlay must carry the
    // same pan/zoom transform the canvas draws with, else they'd drift apart.
    const overlayGroup = container.querySelector('svg[aria-hidden="true"] > g');
    expect(overlayGroup?.getAttribute("transform")).toMatch(/^translate\(.*\) scale\(1\)$/);
  });

  it("reports default marker clicks from the Canvas renderer", () => {
    const onMarkerClick = vi.fn();
    render(
      <GeoMap
        renderer="canvas"
        markers={[{ id: "origin", coordinates: [0, 0], size: 8 }]}
        onMarkerClick={onMarkerClick}
        aria-label="Canvas marker map"
      />,
    );
    const canvas = screen.getByRole("img", { name: "Canvas marker map" });
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      width: 960,
      height: 500,
      top: 0,
      right: 960,
      bottom: 500,
      left: 0,
      toJSON: () => ({}),
    });
    const projection = createFlatProjection("naturalEarth1", { width: 960, height: 500 });
    const [px, py] = projection([0, 0])!;
    const [cx, cy] = projection([0, 20])!;
    const x = 480 + px - cx;
    const y = 250 + py - cy;
    fireEvent.click(canvas, { clientX: x, clientY: y });
    expect(onMarkerClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "origin" }),
    );
  });

  it("renders live objects rotated by heading", () => {
    const { container } = render(
      <GeoMap
        countries={{ data: world }}
        live={{
          objects: [
            { id: "fl1", coordinates: [10, 45], heading: 90, label: "CB123" },
          ],
          transitionMs: 0,
        }}
      />,
    );
    const rotated = [...container.querySelectorAll("g")].some((g) =>
      g.getAttribute("transform")?.startsWith("rotate(90"),
    );
    expect(rotated).toBe(true);
    expect(container.textContent).toContain("CB123");
  });

  it("casings a live glyph, label and trail so they read on dark land (styled presets only)", () => {
    const live = {
      objects: [
        {
          id: "fl1",
          coordinates: [90, 60] as [number, number],
          heading: 45,
          label: "CB404",
          trail: [
            [70, 55],
            [90, 60],
          ] as [number, number][],
        },
      ],
      transitionMs: 0,
    };
    const { container, rerender } = render(
      <GeoMap countries={{ data: world }} preset="light" live={live} />,
    );
    // Glyph + label carry a stroke casing painted behind the fill.
    const glyph = container.querySelector(".geomap-live-icon")!;
    expect(glyph.getAttribute("paint-order")).toBe("stroke");
    expect(glyph.getAttribute("stroke")).toContain("--geomap-halo");
    const label = container.querySelector(".geomap-live .geomap-label")!;
    expect(label.getAttribute("stroke")).toContain("--geomap-halo");
    // The trail gets a wider halo-colored casing line beneath it.
    expect(container.querySelector(".geomap-trail-casing")).toBeTruthy();

    // Headless (preset="none"): no halo token, so no casing is emitted.
    rerender(<GeoMap countries={{ data: world }} live={live} />);
    expect(container.querySelector(".geomap-live-icon")!.getAttribute("stroke")).toBeNull();
    expect(container.querySelector(".geomap-trail-casing")).toBeNull();
  });

  it("skips interaction affordances when interactive is false", () => {
    render(<GeoMap countries={{ data: world }} interactive={false} aria-label="static" />);
    const svg = screen.getByRole("img", { name: "static" });
    expect(svg.getAttribute("tabindex")).toBeNull();
  });
});
