import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Topology } from "topojson-specification";
import world110 from "@cublya/world-atlas/countries-110m.json";
import { prepareCountries } from "../core/geodata";
import { createMapCamera } from "../core/camera-map";
import { createGlobeCamera } from "../core/camera-globe";
import { GeoView } from "./GeoView";

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

describe("GeoView", () => {
  it("renders the flat map by default with an overlaid view toggle", () => {
    const { container } = render(<GeoView preset="light" countries={{ data: world }} />);
    expect(container.querySelector("svg.geomap-map")).toBeTruthy();
    expect(container.querySelector("svg.geomap-globe")).toBeNull();
    expect(screen.getByRole("radio", { name: "Globe" })).toBeTruthy();
  });

  it("honors defaultMode='globe' and shows the sphere", () => {
    const { container } = render(
      <GeoView preset="light" defaultMode="globe" countries={{ data: world }} />,
    );
    expect(container.querySelector("svg.geomap-globe")).toBeTruthy();
    expect(container.querySelector(".geomap-sphere")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Flat map" })).toBeTruthy();
  });

  it("toggles between surfaces when the control is pressed (uncontrolled)", () => {
    const { container } = render(<GeoView preset="light" countries={{ data: world }} />);
    fireEvent.click(screen.getByRole("radio", { name: "Globe" }));
    expect(container.querySelector("svg.geomap-globe")).toBeTruthy();
    expect(container.querySelector("svg.geomap-map")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Flat map" }));
    expect(container.querySelector("svg.geomap-map")).toBeTruthy();
  });

  it("is controllable via mode + onModeChange without flipping itself", () => {
    const onModeChange = vi.fn();
    const { container, rerender } = render(
      <GeoView preset="light" mode="map" onModeChange={onModeChange} countries={{ data: world }} />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Globe" }));
    // Controlled: it reports the request but stays on the map until the prop changes.
    expect(onModeChange).toHaveBeenCalledWith("globe");
    expect(container.querySelector("svg.geomap-map")).toBeTruthy();
    rerender(
      <GeoView preset="light" mode="globe" onModeChange={onModeChange} countries={{ data: world }} />,
    );
    expect(container.querySelector("svg.geomap-globe")).toBeTruthy();
  });

  it("bridges the geographic centre across the switch (map centre → globe facing)", () => {
    const mapCamera = createMapCamera();
    const globeCamera = createGlobeCamera();
    mapCamera.set({ center: [30, 40], zoom: 1 });
    render(
      <GeoView
        preset="light"
        mapCamera={mapCamera}
        globeCamera={globeCamera}
        countries={{ data: world }}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Globe" }));
    // Facing [30,40] means rotating the globe to [-30,-40].
    expect(globeCamera.getView().rotation[0]).toBeCloseTo(-30, 5);
    expect(globeCamera.getView().rotation[1]).toBeCloseTo(-40, 5);
  });

  it("bridges the globe facing back to the map centre", () => {
    const mapCamera = createMapCamera();
    const globeCamera = createGlobeCamera();
    globeCamera.set({ rotation: [-100, -20, 0], zoom: 1 });
    render(
      <GeoView
        preset="light"
        defaultMode="globe"
        mapCamera={mapCamera}
        globeCamera={globeCamera}
        countries={{ data: world }}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Flat map" }));
    expect(mapCamera.getView().center[0]).toBeCloseTo(100, 5);
    expect(mapCamera.getView().center[1]).toBeCloseTo(20, 5);
  });

  it("toggle and controls can each be turned off independently", () => {
    const { rerender } = render(
      <GeoView preset="light" controls={false} countries={{ data: world }} />,
    );
    // controls={false} drops the zoom cluster but keeps the view toggle.
    expect(screen.queryByRole("group", { name: "Map controls" })).toBeNull();
    expect(screen.getByRole("radiogroup", { name: "Map view" })).toBeTruthy();
    rerender(
      <GeoView preset="light" toggle={false} controls={false} countries={{ data: world }} />,
    );
    expect(screen.queryByRole("radiogroup", { name: "Map view" })).toBeNull();
    expect(screen.queryByRole("group", { name: "Map controls" })).toBeNull();
  });
});
