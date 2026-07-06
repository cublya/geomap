import type { Coordinate, Rotation } from "../types";
import {
  angularDistance,
  clamp,
  shortestAngleDelta,
  sphericalCentroid,
  toLonLat,
} from "./coords";
import { prefersReducedMotion, startDecay, tween, type Cancel } from "./animation";
import type { FitOptions, FlyToOptions } from "./camera-map";

export interface GlobeView {
  rotation: Rotation;
  zoom: number;
}

export interface GlobeCameraOptions {
  rotation?: Rotation;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
}

export interface GlobeCamera {
  readonly view: GlobeView;
  subscribe(listener: () => void): () => void;
  getView(): GlobeView;
  set(view: Partial<GlobeView>): void;
  /** Rotate by a delta in degrees (drag steps, inertia, keyboard). */
  rotateBy(dLambda: number, dPhi: number): void;
  zoomIn(): void;
  zoomOut(): void;
  zoomTo(zoom: number): void;
  flyTo(target: Partial<GlobeView>, options?: FlyToOptions): void;
  /** Rotate a coordinate to face the camera. */
  focus(coordinate: Coordinate, options?: { zoom?: number } & FlyToOptions): void;
  /** Frame a set of coordinates: rotate to their spherical centroid, zoom to fit. */
  fitTo(coordinates: Coordinate[], options?: FitOptions): void;
  reset(options?: FlyToOptions): void;
  /** Start an inertial spin with per-frame degree velocities. */
  startInertia(velocity: [number, number]): void;
  stopAnimations(): void;
  readonly minZoom: number;
  readonly maxZoom: number;
}

const clampPhi = (phi: number) => clamp(phi, -90, 90);

export function createGlobeCamera(options: GlobeCameraOptions = {}): GlobeCamera {
  const minZoom = options.minZoom ?? 1;
  const maxZoom = options.maxZoom ?? 6;
  const initial: GlobeView = {
    rotation: options.rotation ?? [-10, -18, 0],
    zoom: clamp(options.zoom ?? 1, minZoom, maxZoom),
  };

  let view: GlobeView = { rotation: [...initial.rotation], zoom: initial.zoom };
  let cancelAnim: Cancel | null = null;
  const listeners = new Set<() => void>();

  const notify = () => listeners.forEach((l) => l());

  const setView = (next: GlobeView) => {
    view = {
      rotation: [next.rotation[0], clampPhi(next.rotation[1]), next.rotation[2]],
      zoom: clamp(next.zoom, minZoom, maxZoom),
    };
    notify();
  };

  const stopAnimations = () => {
    cancelAnim?.();
    cancelAnim = null;
  };

  const flyTo = (target: Partial<GlobeView>, opts: FlyToOptions = {}) => {
    stopAnimations();
    const from = view;
    const toRotation = target.rotation ?? from.rotation;
    const toZoom = clamp(target.zoom ?? from.zoom, minZoom, maxZoom);
    // Take the short way around on lambda so flying JP→US doesn't spin the long way.
    const dLambda = shortestAngleDelta(from.rotation[0], toRotation[0]);
    const dPhi = clampPhi(toRotation[1]) - from.rotation[1];
    const dGamma = shortestAngleDelta(from.rotation[2], toRotation[2]);
    cancelAnim = tween({
      durationMs: opts.durationMs ?? 650,
      immediate: prefersReducedMotion(),
      onUpdate: (e) => {
        setView({
          rotation: [
            from.rotation[0] + dLambda * e,
            from.rotation[1] + dPhi * e,
            from.rotation[2] + dGamma * e,
          ],
          zoom: from.zoom + (toZoom - from.zoom) * e,
        });
      },
      onDone: () => {
        cancelAnim = null;
      },
    });
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
      setView({
        rotation: next.rotation ?? view.rotation,
        zoom: next.zoom ?? view.zoom,
      });
    },
    rotateBy(dLambda, dPhi) {
      setView({
        rotation: [view.rotation[0] + dLambda, view.rotation[1] + dPhi, view.rotation[2]],
        zoom: view.zoom,
      });
    },
    zoomIn() {
      flyTo({ zoom: view.zoom * 1.3 }, { durationMs: 250 });
    },
    zoomOut() {
      flyTo({ zoom: view.zoom / 1.3 }, { durationMs: 250 });
    },
    zoomTo(zoom) {
      flyTo({ zoom }, { durationMs: 250 });
    },
    flyTo,
    focus(coordinate, opts = {}) {
      const [lon, lat] = toLonLat(coordinate);
      flyTo(
        {
          rotation: [-lon, -lat, 0],
          zoom: opts.zoom ?? Math.max(view.zoom, 1.8),
        },
        opts,
      );
    },
    fitTo(coordinates, opts = {}) {
      if (coordinates.length === 0) return;
      const center = sphericalCentroid(coordinates);
      let maxAngle = 0;
      for (const c of coordinates) {
        maxAngle = Math.max(maxAngle, angularDistance(center, c));
      }
      // At zoom z the orthographic frame shows an angular radius of asin(1/z),
      // so the largest zoom that keeps everything visible is 1/sin(angle).
      const coverage = opts.coverage ?? 0.7;
      const padded = clamp(maxAngle / coverage, 0.02, Math.PI / 2 - 0.01);
      const zoom = clamp(
        coordinates.length === 1 ? 1.8 : 1 / Math.sin(padded),
        minZoom,
        opts.maxZoom ?? maxZoom,
      );
      flyTo({ rotation: [-center[0], -center[1], 0], zoom });
    },
    reset(opts) {
      flyTo(initial, opts);
    },
    startInertia(velocity) {
      if (prefersReducedMotion()) return;
      stopAnimations();
      cancelAnim = startDecay({
        velocity,
        onStep: (vx, vy) => {
          setView({
            rotation: [view.rotation[0] + vx, view.rotation[1] + vy, view.rotation[2]],
            zoom: view.zoom,
          });
        },
      });
    },
    stopAnimations,
    minZoom,
    maxZoom,
  };
}
