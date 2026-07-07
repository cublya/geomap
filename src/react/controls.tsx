import * as React from "react";
import { cx, resolveTheme, type GeoPresetName, type GeoTheme } from "../theme";

/** Structural subset shared by MapCamera and GlobeCamera. */
export interface CameraControlsHandle {
  zoomIn(): void;
  zoomOut(): void;
  reset(): void;
}

/** Per-part class hooks — the seam for Tailwind (or any utility CSS). */
export interface GeoControlsClassNames {
  /** The outer group (the pill container). */
  root?: string;
  /** Applied to every button. */
  button?: string;
  /** Applied to the zoom-in button only (after `button`). */
  zoomIn?: string;
  /** Applied to the zoom-out button only (after `button`). */
  zoomOut?: string;
  /** Applied to the reset button only (after `button`). */
  reset?: string;
}

export interface GeoControlsProps {
  camera: CameraControlsHandle;
  /**
   * Match the map's preset for a consistent look; default "none" renders bare,
   * style-free buttons so your own CSS/Tailwind owns 100% of the look.
   */
  preset?: GeoPresetName;
  /** Partial token overrides applied over the preset. */
  theme?: Partial<GeoTheme>;
  /** Stack direction of the button cluster. Defaults to "vertical". */
  orientation?: "vertical" | "horizontal";
  /**
   * Per-part class hooks for Tailwind / utility CSS. Combine with `preset="none"`
   * for full control (no inline styles to fight), or layer over a preset to tweak.
   */
  classNames?: GeoControlsClassNames;
  /** Convenience alias for `classNames.root`; both are applied. */
  className?: string;
  style?: React.CSSProperties;
  labels?: { zoomIn?: string; zoomOut?: string; reset?: string };
}

type Key = "zoomIn" | "zoomOut" | "reset";

function Icon({ kind }: { kind: Key }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {kind === "zoomIn" && <path d="M8 3.5v9M3.5 8h9" />}
      {kind === "zoomOut" && <path d="M3.5 8h9" />}
      {kind === "reset" && <path d="M12.5 8a4.5 4.5 0 1 1-1.32-3.18M12.5 3.1v2.5H10" />}
    </svg>
  );
}

/**
 * Zoom-in / zoom-out / reset button cluster, rendered as a single segmented
 * "pill" with hairline dividers and crisp SVG icons.
 *
 * Styling model (pick one, or mix):
 *   • `preset` → complete look out of the box via inline token styles, no CSS
 *     import required. Import `@cublya/geomap/styles.css` to add hover/focus polish.
 *   • `classNames` → per-part Tailwind/utility classes. Pair with `preset="none"`
 *     so nothing is inlined and your classes win outright.
 *   • `preset="none"` alone → headless: no inline styles, just the semantic
 *     `.geomap-controls*` classes and `data-geomap-part` hooks for raw CSS.
 *
 * Position it via `className`/`style`; it renders in normal flow.
 */
export function GeoControls({
  camera,
  preset = "none",
  theme,
  orientation = "vertical",
  classNames,
  className,
  style,
  labels,
}: GeoControlsProps) {
  const t = React.useMemo(() => resolveTheme(preset, theme), [preset, theme]);
  const styled = preset !== "none" || theme !== undefined;
  const horizontal = orientation === "horizontal";
  const divider = t.controlBorder ?? "transparent";

  const buttons: Array<{ key: Key; part: string; label: string; action: () => void }> = [
    { key: "zoomIn", part: "zoom-in", label: labels?.zoomIn ?? "Zoom in", action: () => camera.zoomIn() },
    { key: "zoomOut", part: "zoom-out", label: labels?.zoomOut ?? "Zoom out", action: () => camera.zoomOut() },
    { key: "reset", part: "reset", label: labels?.reset ?? "Reset view", action: () => camera.reset() },
  ];

  const rootStyle: React.CSSProperties | undefined = styled
    ? {
        display: "inline-flex",
        flexDirection: horizontal ? "row" : "column",
        background: t.controlBg,
        border: `1px solid ${t.controlBorder ?? "transparent"}`,
        borderRadius: 10,
        overflow: "hidden",
        boxShadow:
          "0 1px 2px oklch(0.15 0.02 260 / 0.1), 0 4px 12px oklch(0.15 0.02 260 / 0.08)",
        ...style,
      }
    : style;

  return (
    <div
      role="group"
      aria-label="Map controls"
      data-geomap-part="controls"
      data-geomap-orientation={orientation}
      className={cx("geomap-controls", classNames?.root, className)}
      style={rootStyle}
    >
      {buttons.map(({ key, part, label, action }, i) => {
        const buttonStyle: React.CSSProperties | undefined = styled
          ? {
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              padding: 0,
              border: "none",
              background: "transparent",
              color: t.controlInk,
              cursor: "pointer",
              transition: "background 120ms ease",
              ...(i > 0 &&
                (horizontal
                  ? { borderLeft: `1px solid ${divider}` }
                  : { borderTop: `1px solid ${divider}` })),
            }
          : undefined;
        return (
          <button
            key={key}
            type="button"
            aria-label={label}
            data-geomap-part={part}
            className={cx("geomap-controls__button", classNames?.button, classNames?.[key])}
            onClick={action}
            style={buttonStyle}
          >
            <Icon kind={key} />
          </button>
        );
      })}
    </div>
  );
}
