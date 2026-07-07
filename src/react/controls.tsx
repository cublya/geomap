import * as React from "react";
import { cx, resolveTheme, type GeoPresetName, type GeoTheme } from "../theme";

/** Structural subset shared by MapCamera and GlobeCamera. */
export interface CameraControlsHandle {
  zoomIn(): void;
  zoomOut(): void;
  reset(): void;
}

export interface GeoControlsProps {
  camera: CameraControlsHandle;
  /**
   * Match the map's preset for a consistent look; default "none" renders bare
   * buttons for your own CSS.
   */
  preset?: GeoPresetName;
  /** Partial token overrides applied over the preset. */
  theme?: Partial<GeoTheme>;
  className?: string;
  style?: React.CSSProperties;
  labels?: { zoomIn?: string; zoomOut?: string; reset?: string };
}

/**
 * Zoom-in / zoom-out / reset button cluster. With a `preset` it looks complete
 * out of the box via preset tokens (inline styles — no CSS import needed); the
 * optional `@cublya/geomap/styles.css` adds hover/focus polish that attributes
 * can't express. Position it via `className`/`style` — it renders in normal
 * flow.
 */
export function GeoControls({
  camera,
  preset = "none",
  theme,
  className,
  style,
  labels,
}: GeoControlsProps) {
  const t = React.useMemo(() => resolveTheme(preset, theme), [preset, theme]);
  const styled = preset !== "none" || theme !== undefined;

  const buttonStyle: React.CSSProperties | undefined = styled
    ? {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        padding: 0,
        border: `1px solid ${t.controlBorder ?? "transparent"}`,
        borderRadius: 8,
        background: t.controlBg,
        color: t.controlInk,
        font: "600 14px/1 system-ui, sans-serif",
        cursor: "pointer",
      }
    : undefined;

  const buttons: Array<{ label: string; glyph: string; action: () => void }> = [
    { label: labels?.zoomIn ?? "Zoom in", glyph: "+", action: () => camera.zoomIn() },
    { label: labels?.zoomOut ?? "Zoom out", glyph: "−", action: () => camera.zoomOut() },
    { label: labels?.reset ?? "Reset view", glyph: "⟲", action: () => camera.reset() },
  ];

  return (
    <div
      role="group"
      aria-label="Map controls"
      className={cx("geomap-controls", className)}
      style={{
        ...(styled && { display: "flex", flexDirection: "column", gap: 4 }),
        ...style,
      }}
    >
      {buttons.map(({ label, glyph, action }) => (
        <button
          key={label}
          type="button"
          className="geomap-controls__button"
          aria-label={label}
          onClick={action}
          style={buttonStyle}
        >
          {glyph}
        </button>
      ))}
    </div>
  );
}
