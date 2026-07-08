import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFlatProjection } from "./projections";
import { createMapCamera, type MapCameraEnv } from "./camera-map";

function makeEnv(width = 960, height = 500): MapCameraEnv {
  return { projection: createFlatProjection("naturalEarth1", { width, height }), width, height };
}

// Cameras animate via rAF; drive frames manually so tests are deterministic.
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

describe("createMapCamera", () => {
  it("clamps zoom to [minZoom, maxZoom]", () => {
    const camera = createMapCamera({ minZoom: 1, maxZoom: 4 });
    camera.set({ zoom: 99 });
    expect(camera.view.zoom).toBe(4);
    camera.set({ zoom: 0.01 });
    expect(camera.view.zoom).toBe(1);
  });

  it("notifies subscribers on view changes", () => {
    const camera = createMapCamera();
    const listener = vi.fn();
    camera.subscribe(listener);
    camera.set({ zoom: 2 });
    expect(listener).toHaveBeenCalled();
  });

  it("keeps the geographic point under the pointer fixed while zooming", () => {
    const camera = createMapCamera();
    const env = makeEnv();
    camera.attachEnv(env);
    camera.set({ center: [10, 45], zoom: 2 });

    const focal: [number, number] = [300, 180];
    const t = camera.getTransform();
    const before = env.projection.invert!([
      (focal[0] - t.x) / t.k,
      (focal[1] - t.y) / t.k,
    ]);

    camera.zoomAtPixel(1.7, focal);

    const t2 = camera.getTransform();
    const after = env.projection.invert!([
      (focal[0] - t2.x) / t2.k,
      (focal[1] - t2.y) / t2.k,
    ]);
    expect(after![0]).toBeCloseTo(before![0], 4);
    expect(after![1]).toBeCloseTo(before![1], 4);
    expect(camera.view.zoom).toBeCloseTo(2 * 1.7, 6);
  });

  it("pans by screen pixels", () => {
    const camera = createMapCamera();
    camera.attachEnv(makeEnv());
    camera.set({ center: [0, 0], zoom: 2 });
    const before = camera.view.center[0];
    camera.panBy(100, 0); // drag content right → view moves west
    expect(camera.view.center[0]).toBeLessThan(before);
  });

  it("cancels an active zoom tween before panning", () => {
    let now = 0;
    let nextFrame = 1;
    const frames = new Map<number, FrameRequestCallback>();
    const flushNextFrame = () => {
      const entry = frames.entries().next().value as [number, FrameRequestCallback] | undefined;
      expect(entry).toBeTruthy();
      const [id, cb] = entry!;
      frames.delete(id);
      now += 16;
      cb(now);
    };
    const flushFrames = () => {
      for (let i = 0; i < 30 && frames.size > 0; i += 1) flushNextFrame();
    };

    vi.stubGlobal("performance", { now: () => now });
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      const id = nextFrame;
      nextFrame += 1;
      frames.set(id, cb);
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      frames.delete(id);
    });

    const camera = createMapCamera();
    camera.attachEnv(makeEnv());
    const before = camera.view.center[0];

    camera.zoomIn();
    flushNextFrame();
    expect(camera.view.zoom).toBeGreaterThan(1);

    camera.panBy(-40, 0);
    const afterPan = camera.view.center[0];
    expect(afterPan).toBeGreaterThan(before);

    flushFrames();
    expect(camera.view.center[0]).toBeCloseTo(afterPan, 5);
  });

  it("fits a set of coordinates into the frame", () => {
    const camera = createMapCamera();
    const env = makeEnv();
    camera.attachEnv(env);
    camera.fitTo([
      [5, 45],
      [15, 55],
    ]);
    const { center, zoom } = camera.view;
    expect(center[0]).toBeCloseTo(10, 0);
    expect(center[1]).toBeCloseTo(50, 0);
    expect(zoom).toBeGreaterThan(1);
    // Everything projected must land inside the frame.
    const t = camera.getTransform();
    for (const point of [
      [5, 45],
      [15, 55],
    ] as [number, number][]) {
      const p = env.projection(point)!;
      const x = t.x + t.k * p[0];
      const y = t.y + t.k * p[1];
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(env.width);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(env.height);
    }
  });

  it("queues fitTo until the environment attaches", () => {
    const camera = createMapCamera();
    camera.fitTo([
      [5, 45],
      [15, 55],
    ]);
    expect(camera.view.zoom).toBe(1);
    camera.attachEnv(makeEnv());
    expect(camera.view.zoom).toBeGreaterThan(1);
  });

  it("flyTo tweens to the target and reset returns to the initial view", () => {
    const camera = createMapCamera({ center: [0, 20], zoom: 1 });
    camera.attachEnv(makeEnv());
    camera.flyTo({ center: [100, 10], zoom: 3 }, { durationMs: 100 });
    expect(camera.view.zoom).toBeCloseTo(3, 5);
    expect(camera.view.center[0]).toBeCloseTo(100, 5);
    camera.reset();
    expect(camera.view.zoom).toBeCloseTo(1, 5);
    expect(camera.view.center[0]).toBeCloseTo(0, 5);
  });

  // A far pan between two equally-zoomed views: the "arc" curve zooms out in the
  // middle (Van Wijk), while "linear" holds the shared zoom the whole way.
  const zoomsDuring = (curve: "arc" | "linear") => {
    const camera = createMapCamera({ center: [-100, 0], zoom: 6, maxZoom: 20 });
    camera.attachEnv(makeEnv());
    const zooms: number[] = [];
    camera.subscribe(() => zooms.push(camera.view.zoom));
    camera.flyTo({ center: [100, 0], zoom: 6 }, { durationMs: 160, curve });
    return zooms;
  };

  it("arc curve zooms out during a far pan", () => {
    const zooms = zoomsDuring("arc");
    expect(Math.min(...zooms)).toBeLessThan(6 - 0.5);
    expect(zooms.at(-1)).toBeCloseTo(6, 5);
  });

  it("linear curve holds zoom across a far pan", () => {
    const zooms = zoomsDuring("linear");
    expect(Math.min(...zooms)).toBeCloseTo(6, 5);
    expect(Math.max(...zooms)).toBeCloseTo(6, 5);
  });
});
