import * as React from "react";
import { cx, resolveTheme, type GeoPresetName, type GeoTheme } from "../theme";

export interface GeoTooltipProps {
  /**
   * Client (viewport) coordinates — pass `hover.point` from `countries.onHover`.
   * Null/undefined renders nothing.
   */
  point: [number, number] | null | undefined;
  /**
   * Match the map's preset for a consistent look; default "none" renders a
   * bare positioned div for your CSS.
   */
  preset?: GeoPresetName;
  /** Partial token overrides applied over the preset. */
  theme?: Partial<GeoTheme>;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Hover tooltip positioned above the pointer. Positioning is always inline;
 * with a preset the surface (background/ink/border) is complete without any
 * CSS import. The optional stylesheet adds only cosmetic polish (shadow).
 */
export function GeoTooltip({
  point,
  preset = "none",
  theme,
  children,
  className,
  style,
}: GeoTooltipProps) {
  const t = resolveTheme(preset, theme);
  if (!point || children == null) return null;
  const styled = preset !== "none" || theme !== undefined;
  return (
    <div
      role="tooltip"
      className={cx("geomap-tooltip", className)}
      style={{
        position: "fixed",
        left: point[0],
        top: point[1],
        transform: "translate(-50%, calc(-100% - 10px))",
        pointerEvents: "none",
        zIndex: 50,
        ...(styled && {
          maxWidth: 280,
          padding: "6px 10px",
          border: `1px solid ${t.tooltipBorder ?? "transparent"}`,
          borderRadius: 8,
          background: t.tooltipBg,
          color: t.tooltipInk,
          font: "500 13px/1.35 system-ui, sans-serif",
        }),
        ...style,
      }}
    >
      {children}
    </div>
  );
}
