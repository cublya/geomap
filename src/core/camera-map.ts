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

/**
 * How a fly/fit animates between two views:
 * - `"arc"` (default) — Van Wijk smooth zoom-and-pan: far jumps zoom out, travel,
 *   then zoom back in, so you never slide across the world at full zoom.
 * - `"linear"` — a direct path: pan the centre straight to the target while the
 *   zoom eases along a geometric (perceptually even) ramp.
 */
export type FlyCurve = "arc" | "linear";

export interface FlyToOptions {
  durationMs?: number;
  curve?: FlyCurve;
}

export interface FitOptions {
  /** Fraction of the frame the target may occupy, 0–1. Default 0.7. */
  coverage?: number;
  maxZoom?: number;
  curve?: FlyCurve;
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

const cosh = (x: number) => (Math.exp(x) + Math.exp(-x)) / 2;
const sinh = (x: number) => (Math.exp(x) - Math.exp(-x)) / 2;
const tanh = (x: number) => {
  const e = Math.exp(2 * x);
  return (e - 1) / (e + 1);
};

/**
 * Van Wijk & Nuij smooth zoom-and-pan. Interpolates between two views expressed
 * as `[cx, cy, w]` — centre in projected pixels and `w` the viewport width in
 * those same pixels. A far pan arcs outward (the camera zooms out, travels, then
 * zooms back in) instead of sliding across the world at full zoom; a pure zoom
 * (identical centre) just eases the scale in place. Mirrors `d3.interpolateZoom`
 * so we get the behaviour without taking on the dependency.
 */
function zoomPanInterpolator(
  a: [number, number, number],
  b: [number, number, number],
): (t: number) => [number, number, number] {
  const rho = Math.SQRT2;
  const rho2 = 2;
  const rho4 = 4;
  const [ux0, uy0, w0] = a;
  const [ux1, uy1, w1] = b;
  const dx = ux1 - ux0;
  const dy = uy1 - uy0;
  const d2 = dx * dx + dy * dy;

  // Concentric case (no pan): an exponential — perceptually even — zoom ramp.
  if (d2 < 1e-12) {
    const S = Math.log(w1 / w0) / rho;
    return (t) => [ux0 + t * dx, uy0 + t * dy, w0 * Math.exp(rho * t * S)];
  }

  const d1 = Math.sqrt(d2);
  const b0 = (w1 * w1 - w0 * w0 + rho4 * d2) / (2 * w0 * rho2 * d1);
  const b1 = (w1 * w1 - w0 * w0 - rho4 * d2) / (2 * w1 * rho2 * d1);
  const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
  const r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
  const S = (r1 - r0) / rho;
  const coshr0 = cosh(r0);
  return (t) => {
    const s = t * S;
    const u = (w0 / (rho2 * d1)) * (coshr0 * tanh(rho * s + r0) - sinh(r0));
    return [ux0 + u * dx, uy0 + u * dy, (w0 * coshr0) / cosh(rho * s + r0)];
  };
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

    // The arc curve works in the projected metric; build it only when a
    // projection is attached (post-layout) and invertible, else fall back to the
    // linear tween below.
    const resolved = env;
    let arc: ((t: number) => MapView) | null = null;
    if ((opts.curve ?? "arc") === "arc" && resolved?.projection.invert) {
      const p0 = resolved.projection(from.center);
      const p1 = resolved.projection(to.center);
      const invert = resolved.projection.invert;
      const { width } = resolved;
      if (p0 && p1) {
        const interp = zoomPanInterpolator(
          [p0[0], p0[1], width / from.zoom],
          [p1[0], p1[1], width / to.zoom],
        );
        arc = (t) => {
          const [ux, uy, w] = interp(t);
          const inv = invert([ux, uy]);
          return { center: inv ? [inv[0], inv[1]] : to.center, zoom: width / w };
        };
      }
    }

    cancelAnim = tween({
      durationMs: opts.durationMs ?? 600,
      immediate: prefersReducedMotion(),
      onUpdate: (e) => {
        setView(
          arc
            ? arc(e)
            : {
                center: [
                  from.center[0] + (to.center[0] - from.center[0]) * e,
                  from.center[1] + (to.center[1] - from.center[1]) * e,
                ],
                // Geometric (multiplicative) ramp so the zoom reads as
                // perceptually even rather than accelerating at one end.
                zoom: from.zoom * Math.pow(to.zoom / from.zoom, e),
              },
        );
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
      flyTo({ ...initial, zoom: minZoom }, { curve: opts.curve });
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
    flyTo({ center, zoom }, { curve: opts.curve });
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
