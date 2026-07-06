import { beforeAll, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach } from "vitest";
import type { Topology } from "topojson-specification";
import world110 from "world-atlas/countries-110m.json";
import { prepareCountries } from "../core/geodata";
import { createMapCamera } from "../core/camera-map";
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

  it("skips interaction affordances when interactive is false", () => {
    render(<GeoMap countries={{ data: world }} interactive={false} aria-label="static" />);
    const svg = screen.getByRole("img", { name: "static" });
    expect(svg.getAttribute("tabindex")).toBeNull();
  });
});
