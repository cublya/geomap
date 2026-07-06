import * as React from "react";
import { cx } from "../theme";

/** Structural subset shared by MapCamera and GlobeCamera. */
export interface CameraControlsHandle {
  zoomIn(): void;
  zoomOut(): void;
  reset(): void;
}

export interface GeoControlsProps {
  camera: CameraControlsHandle;
  className?: string;
  style?: React.CSSProperties;
  labels?: { zoomIn?: string; zoomOut?: string; reset?: string };
}

/**
 * Optional zoom-in / zoom-out / reset button cluster. Fully functional without
 * any CSS; import `@cublya/geo/styles.css` (or style `.cublya-geo-controls*`
 * yourself) for cosmetics. Position it via `className`/`style` — it renders in
 * normal flow.
 */
export function GeoControls({ camera, className, style, labels }: GeoControlsProps) {
  return (
    <div
      role="group"
      aria-label="Map controls"
      className={cx("cublya-geo-controls", className)}
      style={style}
    >
      <button
        type="button"
        className="cublya-geo-controls__button"
        aria-label={labels?.zoomIn ?? "Zoom in"}
        onClick={() => camera.zoomIn()}
      >
        +
      </button>
      <button
        type="button"
        className="cublya-geo-controls__button"
        aria-label={labels?.zoomOut ?? "Zoom out"}
        onClick={() => camera.zoomOut()}
      >
        −
      </button>
      <button
        type="button"
        className="cublya-geo-controls__button"
        aria-label={labels?.reset ?? "Reset view"}
        onClick={() => camera.reset()}
      >
        ⟲
      </button>
    </div>
  );
}
