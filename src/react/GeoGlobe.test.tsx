import { beforeAll, describe, expect, it, vi, afterEach } from "vitest";
import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Topology } from "topojson-specification";
import world110 from "@cublya/world-atlas/countries-110m.json";
import { prepareCountries } from "../core/geodata";
import { createGlobeCamera } from "../core/camera-globe";
import { createGlobeProjection, configureGlobe } from "../core/projections";
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

  it("renders a Canvas surface when requested", () => {
    const { container } = render(
      <GeoGlobe renderer="canvas" countries={{ data: world }} aria-label="Canvas globe" />,
    );
    const canvas = screen.getByRole("img", { name: "Canvas globe" });
    expect(canvas.tagName.toLowerCase()).toBe("canvas");
    expect(container.querySelector("svg.geomap-globe")).toBeNull();
  });

  it("culls backface markers from Canvas hit-testing", () => {
    // Default rotation faces the Atlantic ([-10, -18]); Lisbon is on the front,
    // Tokyo on the far side. Both raw-project to a finite point on the disc, so
    // only the isVisible cull keeps a far-side click from registering.
    const size = { width: 960, height: 540 };
    const projection = configureGlobe(createGlobeProjection(size), size, [-10, -18, 0], 1);
    const lisbon = projection([-9.14, 38.72])!;
    const tokyo = projection([139.69, 35.68])!;
    const onMarkerClick = vi.fn();
    render(
      <GeoGlobe
        renderer="canvas"
        markers={[
          { id: "lis", coordinates: [-9.14, 38.72] },
          { id: "tyo", coordinates: [139.69, 35.68] },
        ]}
        onMarkerClick={onMarkerClick}
        aria-label="Canvas globe markers"
      />,
    );
    const canvas = screen.getByRole("img", { name: "Canvas globe markers" });
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      width: 960,
      height: 540,
      top: 0,
      right: 960,
      bottom: 540,
      left: 0,
      toJSON: () => ({}),
    });
    // A click at Tokyo's projected spot must not fire — it's on the backface.
    fireEvent.click(canvas, { clientX: tokyo[0], clientY: tokyo[1] });
    expect(onMarkerClick).not.toHaveBeenCalled();
    // Lisbon, on the near face, does fire.
    fireEvent.click(canvas, { clientX: lisbon[0], clientY: lisbon[1] });
    expect(onMarkerClick).toHaveBeenCalledWith(expect.objectContaining({ id: "lis" }));
  });

  it("culls markers on the backface", () => {
    // Default rotation faces the Atlantic (-10, -18); Tokyo is on the far side.
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
    // couple of degrees from the polygon centroid; near is good enough.
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
