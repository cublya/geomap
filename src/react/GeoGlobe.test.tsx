import { beforeAll, describe, expect, it, vi, afterEach } from "vitest";
import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Topology } from "topojson-specification";
import world110 from "world-atlas/countries-110m.json";
import { prepareCountries } from "../core/geodata";
import { createGlobeCamera } from "../core/camera-globe";
import { GeoGlobe } from "./GeoGlobe";

const world = prepareCountries(world110 as unknown as Topology);

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

describe("GeoGlobe", () => {
  it("renders the sphere, graticule and only the visible hemisphere", () => {
    const { container } = render(
      <GeoGlobe countries={{ data: world }} aria-label="Globe" />,
    );
    expect(screen.getByRole("img", { name: "Globe" })).toBeTruthy();
    const countryPaths = container.querySelectorAll("path[data-country]");
    expect(countryPaths.length).toBeGreaterThan(20);
    // clipAngle(90) drops the far hemisphere, so not every country has a path.
    expect(countryPaths.length).toBeLessThan(world.countries.length);
  });

  it("culls markers on the backface", () => {
    // Default rotation faces the Atlantic (-10, -18) — Tokyo is on the far side.
    const { container } = render(
      <GeoGlobe
        countries={{ data: world }}
        markers={[
          { id: "lis", coordinates: { lat: 38.72, lng: -9.14 }, label: "Lisbon" },
          { id: "tyo", coordinates: { lat: 35.68, lng: 139.69 }, label: "Tokyo" },
        ]}
      />,
    );
    expect(container.textContent).toContain("Lisbon");
    expect(container.textContent).not.toContain("Tokyo");
  });

  it("rotates with keyboard controls through a shared camera", () => {
    const camera = createGlobeCamera();
    render(<GeoGlobe countries={{ data: world }} camera={camera} aria-label="g" />);
    const svg = screen.getByRole("img", { name: "g" });
    const lambdaBefore = camera.view.rotation[0];
    fireEvent.keyDown(svg, { key: "ArrowLeft" });
    expect(camera.view.rotation[0]).toBeCloseTo(lambdaBefore + 12, 5);
    fireEvent.keyDown(svg, { key: "+" });
    expect(camera.view.zoom).toBeGreaterThan(1);
    fireEvent.keyDown(svg, { key: "Home" });
    expect(camera.view.zoom).toBeCloseTo(1, 5);
  });

  it("frames the fit target by rotating its centroid to face the camera", () => {
    const camera = createGlobeCamera();
    render(<GeoGlobe countries={{ data: world }} camera={camera} fit={world.get("BR")!} />);
    const [lambda, phi] = camera.view.rotation;
    const [lon, lat] = world.get("BR")!.centroid;
    // Framing uses the spherical centroid of the bbox corners, which sits a
    // couple of degrees from the polygon centroid — near is good enough.
    expect(Math.abs(lambda - -lon)).toBeLessThan(6);
    expect(Math.abs(phi - -lat)).toBeLessThan(6);
  });

  it("selects countries on click", () => {
    const onSelect = vi.fn();
    const { container } = render(<GeoGlobe countries={{ data: world, onSelect }} />);
    const visible = container.querySelector('path[data-country="br"]');
    expect(visible).toBeTruthy();
    fireEvent.click(visible!);
    expect(onSelect.mock.calls[0]![0]!.alpha2).toBe("BR");
  });
});
