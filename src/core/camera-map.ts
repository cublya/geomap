import { geoPath, type GeoProjection } from "d3-geo";
import type { Coordinate, GeoBounds, LonLat, PreparedCountry } from "../types";
import { clamp, geographicBounds, toLonLat } from "./coords";
import { prefersReducedMotion, tween, type Cancel } from "./animation";

export interface MapView {
  center: LonLat;
  zoom: number;
}

export interface MapCameraOptions {
  center?: Coordinate;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
}

export interface FlyToOptions {
  durationMs?: number;
}

export interface FitOptions {
  /** Fraction of the frame the target may occupy, 0–1. Default 0.7. */
  coverage?: number;
  maxZoom?: number;
}

export type FitTarget =
  | "world"
  | Coordinate[]
  | GeoBounds
  | PreparedCountry;

export interface MapCameraEnv {
  projection: GeoProjection;
  width: number;
  height: number;
}

interface ResolvedEnv extends MapCameraEnv {
  /** Projected bbox of the whole sphere, for clamping the centre. */
  worldBounds: [[number, number], [number, number]];
}

export interface ScreenTransform {
  k: number;
  x: number;
  y: number;
}

export interface MapCamera {
  readonly view: MapView;
  subscribe(listener: () => void): () => void;
  getView(): MapView;
  set(view: Partial<MapView>): void;
  panBy(dxPx: number, dyPx: number): void;
  zoomIn(): void;
  zoomOut(): void;
  zoomTo(zoom: number): void;
  zoomAtPixel(factor: number, point: [number, number]): void;
  flyTo(target: Partial<MapView>, options?: FlyToOptions): void;
  fitTo(target: FitTarget, options?: FitOptions): void;
  reset(options?: FlyToOptions): void;
  stopAnimations(): void;
  readonly minZoom: number;
  readonly maxZoom: number;
  /** @internal Wired up by GeoMap; not part of the public API. */
  attachEnv(env: MapCameraEnv | null): void;
  /** @internal */
  getTransform(): ScreenTransform;
}

function isGeoBounds(target: FitTarget): target is GeoBounds {
  return (
    Array.isArray(target) &&
    target.length === 2 &&
    Array.isArray(target[0]) &&
    typeof (target[0] as LonLat)[0] === "number" &&
    Array.isArray(target[1])
  );
}

export function createMapCamera(options: MapCameraOptions = {}): MapCamera {
  const minZoom = options.minZoom ?? 1;
  const maxZoom = options.maxZoom ?? 8;
  const initial: MapView = {
    center: options.center ? toLonLat(options.center) : [0, 20],
    zoom: clamp(options.zoom ?? 1, minZoom, maxZoom),
  };

  let view: MapView = { ...initial };
  let env: ResolvedEnv | null = null;
  let cancelAnim: Cancel | null = null;
  const listeners = new Set<() => void>();
  const pendingFits: Array<() => void> = [];

  const notify = () => listeners.forEach((l) => l());

  const clampView = (next: MapView): MapView => {
    const zoom = clamp(next.zoom, minZoom, maxZoom);
    if (!env) return { center: next.center, zoom };
    const p = env.projection(next.center);
    if (!p || !env.projection.invert) return { center: next.center, zoom };
    const [[wx0, wy0], [wx1, wy1]] = env.worldBounds;
    const clamped: [number, number] = [clamp(p[0], wx0, wx1), clamp(p[1], wy0, wy1)];
    if (clamped[0] === p[0] && clamped[1] === p[1]) return { center: next.center, zoom };
    const center = env.projection.invert(clamped);
    return { center: center ? [center[0], center[1]] : next.center, zoom };
  };

  const setView = (next: MapView) => {
    view = clampView(next);
    notify();
  };

  const transformFor = (v: MapView): ScreenTransform => {
    if (!env) return { k: 1, x: 0, y: 0 };
    const p = env.projection(v.center) ?? [env.width / 2, env.height / 2];
    return {
      k: v.zoom,
      x: env.width / 2 - v.zoom * p[0],
      y: env.height / 2 - v.zoom * p[1],
    };
  };

  const centerForTransform = (k: number, x: number, y: number): LonLat => {
    if (!env?.projection.invert) return view.center;
    const inverted = env.projection.invert([(env.width / 2 - x) / k, (env.height / 2 - y) / k]);
    return inverted ? [inverted[0], inverted[1]] : view.center;
  };

  const stopAnimations = () => {
    cancelAnim?.();
    cancelAnim = null;
  };

  const flyTo = (target: Partial<MapView>, opts: FlyToOptions = {}) => {
    stopAnimations();
    const from = view;
    const to = clampView({
      center: target.center ?? from.center,
      zoom: target.zoom ?? from.zoom,
    });
    cancelAnim = tween({
      durationMs: opts.durationMs ?? 600,
      immediate: prefersReducedMotion(),
      onUpdate: (e) => {
        setView({
          center: [
            from.center[0] + (to.center[0] - from.center[0]) * e,
            from.center[1] + (to.center[1] - from.center[1]) * e,
          ],
          zoom: from.zoom + (to.zoom - from.zoom) * e,
        });
      },
      onDone: () => {
        cancelAnim = null;
      },
    });
  };

  const fitTo = (target: FitTarget, opts: FitOptions = {}) => {
    if (!env) {
      // GeoMap attaches after first layout; remember the request until then.
      pendingFits.push(() => fitTo(target, opts));
      return;
    }
    if (target === "world") {
      flyTo({ ...initial, zoom: minZoom });
      return;
    }
    const coverage = opts.coverage ?? 0.7;
    let geoCorners: LonLat[];
    let center: LonLat;
    if (isGeoBounds(target)) {
      const [[w, s], [e, n]] = target;
      geoCorners = [
        [w, s],
        [e, s],
        [e, n],
        [w, n],
      ];
      center = [(w + e) / 2, (s + n) / 2];
    } else if (Array.isArray(target)) {
      geoCorners = target.map(toLonLat);
      const [[w, s], [e, n]] = geographicBounds(geoCorners);
      center = [(w + e) / 2, (s + n) / 2];
    } else {
      const [[w, s], [e, n]] = target.bounds;
      geoCorners = [
        [w, s],
        [e, s],
        [e, n],
        [w, n],
      ];
      center = target.centroid;
    }
    const projected = geoCorners
      .map((c) => env!.projection(c))
      .filter((p): p is [number, number] => p != null && p.every(Number.isFinite));
    if (projected.length === 0) return;
    let spanX = 0;
    let spanY = 0;
    for (const a of projected) {
      for (const b of projected) {
        spanX = Math.max(spanX, Math.abs(a[0] - b[0]));
        spanY = Math.max(spanY, Math.abs(a[1] - b[1]));
      }
    }
    const zoom = clamp(
      Math.min(
        spanX > 0 ? (env.width * coverage) / spanX : maxZoom,
        spanY > 0 ? (env.height * coverage) / spanY : maxZoom,
      ),
      minZoom,
      opts.maxZoom ?? maxZoom,
    );
    flyTo({ center, zoom });
  };

  return {
    get view() {
      return view;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getView: () => view,
    set(next) {
      stopAnimations();
      setView({ center: next.center ?? view.center, zoom: next.zoom ?? view.zoom });
    },
    panBy(dxPx, dyPx) {
      if (!env) return;
      const t = transformFor(view);
      setView({
        center: centerForTransform(t.k, t.x + dxPx, t.y + dyPx),
        zoom: view.zoom,
      });
    },
    zoomIn() {
      flyTo({ zoom: view.zoom * 1.5 }, { durationMs: 250 });
    },
    zoomOut() {
      flyTo({ zoom: view.zoom / 1.5 }, { durationMs: 250 });
    },
    zoomTo(zoom) {
      flyTo({ zoom }, { durationMs: 250 });
    },
    zoomAtPixel(factor, [fx, fy]) {
      if (!env) return;
      stopAnimations();
      const t = transformFor(view);
      const k = clamp(view.zoom * factor, minZoom, maxZoom);
      // Keep the geographic point under the pointer fixed while scaling.
      const wx = (fx - t.x) / t.k;
      const wy = (fy - t.y) / t.k;
      setView({
        center: centerForTransform(k, fx - k * wx, fy - k * wy),
        zoom: k,
      });
    },
    flyTo,
    fitTo,
    reset(opts) {
      flyTo(initial, opts);
    },
    stopAnimations,
    minZoom,
    maxZoom,
    attachEnv(next) {
      if (!next) {
        env = null;
        return;
      }
      const worldBounds = geoPath(next.projection).bounds({ type: "Sphere" });
      env = { ...next, worldBounds };
      view = clampView(view);
      while (pendingFits.length > 0) pendingFits.shift()!();
    },
    getTransform: () => transformFor(view),
  };
}
