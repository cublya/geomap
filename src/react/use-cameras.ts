import { useState, useSyncExternalStore } from "react";
import {
  createMapCamera,
  type MapCamera,
  type MapCameraOptions,
  type MapView,
} from "../core/camera-map";
import {
  createGlobeCamera,
  type GlobeCamera,
  type GlobeCameraOptions,
  type GlobeView,
} from "../core/camera-globe";

/**
 * A stable flat-map camera handle to pass to `<GeoMap camera={…}>`. Does not
 * re-render the caller on view changes — use {@link useMapView} for that.
 */
export function useMapCamera(options?: MapCameraOptions): MapCamera {
  const [camera] = useState(() => createMapCamera(options));
  return camera;
}

/** A stable globe camera handle to pass to `<GeoGlobe camera={…}>`. */
export function useGlobeCamera(options?: GlobeCameraOptions): GlobeCamera {
  const [camera] = useState(() => createGlobeCamera(options));
  return camera;
}

/** Reactive read of a flat camera's view (re-renders the caller as it changes). */
export function useMapView(camera: MapCamera): MapView {
  return useSyncExternalStore(camera.subscribe, camera.getView, camera.getView);
}

/** Reactive read of a globe camera's view. */
export function useGlobeView(camera: GlobeCamera): GlobeView {
  return useSyncExternalStore(camera.subscribe, camera.getView, camera.getView);
}
