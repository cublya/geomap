import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGlobeCamera } from "./camera-globe";

beforeEach(() => {
  let now = 0;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    now += 16;
    cb(now);
    return 0;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.stubGlobal("performance", { now: () => now });
});

describe("createGlobeCamera", () => {
  it("focus rotates the coordinate to face the camera", () => {
    const camera = createGlobeCamera();
    camera.focus({ lat: 35.6762, lng: 139.6503 }, { durationMs: 50 });
    expect(camera.view.rotation[0]).toBeCloseTo(-139.6503, 3);
    expect(camera.view.rotation[1]).toBeCloseTo(-35.6762, 3);
  });

  it("clamps phi so the poles cannot be overshot", () => {
    const camera = createGlobeCamera();
    camera.rotateBy(0, -500);
    expect(camera.view.rotation[1]).toBe(-90);
    camera.rotateBy(0, 700);
    expect(camera.view.rotation[1]).toBe(90);
  });

  it("takes the short way around on lambda when flying", () => {
    const camera = createGlobeCamera({ rotation: [170, 0, 0] });
    const seen: number[] = [];
    camera.subscribe(() => seen.push(camera.view.rotation[0]));
    camera.flyTo({ rotation: [-170, 0, 0] }, { durationMs: 100 });
    // Short path is +20° (170 → 190 ≡ -170), so lambda should only increase.
    for (const lambda of seen) expect(lambda).toBeGreaterThanOrEqual(170 - 1e-9);
    expect(camera.view.rotation[0]).toBeCloseTo(190, 3);
  });

  it("fits multiple coordinates: centroid faces camera, zoom keeps them visible", () => {
    const camera = createGlobeCamera({ maxZoom: 10 });
    const coords: [number, number][] = [
      [10, 50],
      [30, 40],
    ];
    camera.fitTo(coords, { maxZoom: 10 });
    const [lambda, phi] = camera.view.rotation;
    expect(lambda).toBeLessThan(-9);
    expect(lambda).toBeGreaterThan(-31);
    expect(phi).toBeLessThan(-39);
    expect(phi).toBeGreaterThan(-51);
    // Every point must stay within the visible cap asin(1/zoom).
    const visibleCap = Math.asin(Math.min(1, 1 / camera.view.zoom));
    const centerLon = -lambda;
    const centerLat = -phi;
    for (const [lon, lat] of coords) {
      const rad = Math.PI / 180;
      const angle = Math.acos(
        Math.sin(centerLat * rad) * Math.sin(lat * rad) +
          Math.cos(centerLat * rad) * Math.cos(lat * rad) * Math.cos((lon - centerLon) * rad),
      );
      expect(angle).toBeLessThanOrEqual(visibleCap + 1e-6);
    }
    expect(camera.view.zoom).toBeGreaterThan(1);
  });

  it("zooms within bounds", () => {
    const camera = createGlobeCamera({ minZoom: 1, maxZoom: 4 });
    camera.set({ zoom: 100 });
    expect(camera.view.zoom).toBe(4);
  });

  it("applies inertia as decaying rotation steps", () => {
    const camera = createGlobeCamera({ rotation: [0, 0, 0] });
    camera.startInertia([5, 0]);
    expect(camera.view.rotation[0]).toBeGreaterThan(0);
  });
});
