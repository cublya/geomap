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
   * bare positioned div so your CSS/Tailwind owns the surface.
   */
  preset?: GeoPresetName;
  /** Partial token overrides applied over the preset. */
  theme?: Partial<GeoTheme>;
  children?: React.ReactNode;
  /** Class hook for Tailwind / utility CSS (applied after the base class). */
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Hover tooltip positioned above the pointer.
 *
 * Positioning is always inline (it must follow the cursor). With a `preset` the
 * surface — background, ink, border, shadow — is complete without any CSS import.
 * Use `preset="none"` + `className` (e.g. Tailwind) to own the surface yourself;
 * target `.geomap-tooltip` / `[data-geomap-part="tooltip"]` for raw CSS.
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
      data-geomap-part="tooltip"
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
          padding: "7px 11px",
          border: `1px solid ${t.tooltipBorder ?? "transparent"}`,
          borderRadius: 8,
          background: t.tooltipBg,
          color: t.tooltipInk,
          font: "500 13px/1.4 system-ui, -apple-system, sans-serif",
          boxShadow:
            "0 2px 4px oklch(0.15 0.02 260 / 0.08), 0 8px 24px oklch(0.15 0.02 260 / 0.12)",
        }),
        ...style,
      }}
    >
      {children}
    </div>
  );
}
