import * as React from "react";
import { cx } from "../theme";

export interface GeoTooltipProps {
  /**
   * Client (viewport) coordinates — pass `hover.point` from `countries.onHover`.
   * Null/undefined renders nothing.
   */
  point: [number, number] | null | undefined;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Optional hover tooltip positioned above the pointer. Positioning is inline
 * (works with no CSS); visual styling comes from `@cublya/geo/styles.css` or
 * your own `.cublya-geo-tooltip` rules.
 */
export function GeoTooltip({ point, children, className, style }: GeoTooltipProps) {
  if (!point || children == null) return null;
  return (
    <div
      role="tooltip"
      className={cx("cublya-geo-tooltip", className)}
      style={{
        position: "fixed",
        left: point[0],
        top: point[1],
        transform: "translate(-50%, calc(-100% - 10px))",
        pointerEvents: "none",
        zIndex: 50,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
