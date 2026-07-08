import * as React from "react";
import {
  cx,
  resolveTheme,
  type GeoPreset,
  type GeoPalette,
  type GeoTheme,
} from "../theme";

/**
 * How the leading flag is rendered. `"none"` (default) draws nothing. All the
 * non-emoji styles are vendor-agnostic: `"image"` builds an `<img src>` (any CDN
 * via {@link GeoTooltipProps.flagSrc}) and `"icon"` builds a `<span className>`
 * for CSS icon fonts like flag-icons / circle-flags (any convention via
 * {@link GeoTooltipProps.flagClassName}).
 */
export type GeoFlagStyle = "none" | "emoji" | "image" | "icon";

/** Default `<img>` source for `flagStyle="image"` — flagcdn.com SVGs. */
const defaultFlagSrc = (alpha2: string) => `https://flagcdn.com/${alpha2}.svg`;

/** Default `<span>` class for `flagStyle="icon"` — the flag-icons convention. */
const defaultFlagClassName = (alpha2: string) => `fi fi-${alpha2}`;

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
  preset?: GeoPreset;
  /** Match the map's styling variant. Defaults to "default". */
  palette?: GeoPalette;
  /** Partial token overrides applied over the preset. */
  theme?: Partial<GeoTheme>;
  /**
   * Country ISO 3166-1 alpha-2 code (e.g. `hover.country.id`) to render a
   * leading flag before the content. Any case; ignored if not two letters.
   * Off unless {@link flagStyle} or {@link renderFlag} is set.
   */
  flag?: string;
  /**
   * How to draw the {@link flag}. Defaults to `"none"`. Every style is
   * vendor-agnostic — geomap takes no icon dependency:
   *   • `"emoji"` — regional-indicator emoji, zero dependencies and no network.
   *     Note: Chrome on Windows shows the letters (e.g. "US") instead of a flag;
   *     use `"icon"`/`"image"`/{@link renderFlag} if that matters.
   *   • `"icon"` — a `<span>` for a CSS icon font (flag-icons, circle-flags, …).
   *     The class defaults to flag-icons' `fi fi-{cc}`; override with
   *     {@link flagClassName} for any other library. You supply that library's CSS.
   *   • `"image"` — an `<img>` whose src defaults to flagcdn.com; point at any
   *     CDN (or your own assets) with {@link flagSrc}. A network request, opt-in.
   */
  flagStyle?: GeoFlagStyle;
  /**
   * Build the `<img src>` for `flagStyle="image"` from the lowercased alpha-2
   * code. Defaults to `https://flagcdn.com/{cc}.svg`. Use it to swap in any
   * flag CDN/icon set (e.g. circle-flags) or self-hosted assets.
   */
  flagSrc?: (alpha2: string) => string;
  /**
   * Build the `<span className>` for `flagStyle="icon"` from the lowercased
   * alpha-2 code. Defaults to `fi fi-{cc}` (flag-icons); return whatever class
   * your icon-font library expects.
   */
  flagClassName?: (alpha2: string) => string;
  /**
   * Escape hatch: render the flag yourself from the lowercased alpha-2 code.
   * Overrides {@link flagStyle}, so you can drop in a React flag-component
   * library (country-flag-icons, react-circle-flags, …) or anything else without
   * geomap taking a hard dependency, e.g.
   * `renderFlag={(cc) => <span className={`fi fi-${cc}`} />}`.
   */
  renderFlag?: (alpha2: string) => React.ReactNode;
  children?: React.ReactNode;
  /** Class hook for Tailwind / utility CSS (applied after the base class). */
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Convert an ISO 3166-1 alpha-2 code to its regional-indicator flag emoji.
 * Returns `""` for anything that isn't two ASCII letters. Zero dependencies,
 * no assets, no network — the batteries-included path for {@link GeoTooltip}'s
 * `flagStyle="emoji"`.
 */
export function flagEmoji(alpha2: string): string {
  const cc = alpha2.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(...[...cc].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

/** Resolve the leading flag node, or null when there's nothing to draw. */
function flagNodeFor(
  flag: string | undefined,
  flagStyle: GeoFlagStyle,
  flagSrc: (alpha2: string) => string,
  flagClassName: (alpha2: string) => string,
  renderFlag: ((alpha2: string) => React.ReactNode) | undefined,
): React.ReactNode {
  if (!flag) return null;
  const cc = flag.trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(cc)) return null;
  if (renderFlag) return renderFlag(cc);
  if (flagStyle === "emoji") {
    const emoji = flagEmoji(cc);
    return emoji ? (
      <span data-geomap-part="tooltip-flag" aria-hidden style={{ fontSize: "1.1em", lineHeight: 1 }}>
        {emoji}
      </span>
    ) : null;
  }
  if (flagStyle === "icon") {
    return (
      <span data-geomap-part="tooltip-flag" aria-hidden className={flagClassName(cc)} />
    );
  }
  if (flagStyle === "image") {
    return (
      <img
        data-geomap-part="tooltip-flag"
        src={flagSrc(cc)}
        alt=""
        aria-hidden
        style={{ width: "1.25em", height: "auto", borderRadius: 2, display: "block" }}
      />
    );
  }
  return null;
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
  palette = "default",
  theme,
  flag,
  flagStyle = "none",
  flagSrc = defaultFlagSrc,
  flagClassName = defaultFlagClassName,
  renderFlag,
  children,
  className,
  style,
}: GeoTooltipProps) {
  const t = resolveTheme(preset, palette, theme);
  if (!point || children == null) return null;
  const styled = preset !== "none" || theme !== undefined;
  const border = t.tooltipBorder ?? "transparent";
  const flagNode = flagNodeFor(flag, flagStyle, flagSrc, flagClassName, renderFlag);
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
          padding: "8px 12px",
          border: `1px solid ${border}`,
          borderRadius: 9,
          background: t.tooltipBg,
          color: t.tooltipInk,
          font: "500 13px/1.4 system-ui, -apple-system, sans-serif",
          letterSpacing: "0.01em",
          boxShadow:
            "0 1px 2px oklch(0.15 0.02 260 / 0.10), 0 6px 16px oklch(0.15 0.02 260 / 0.14)",
        }),
        ...style,
      }}
    >
      {flagNode ? (
        <span
          data-geomap-part="tooltip-content"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          {flagNode}
          {children}
        </span>
      ) : (
        children
      )}
      {styled && (
        // A small caret anchors the surface to the cursor. It is a rotated
        // square sharing the tooltip's fill; only its two lower borders show
        // below the body, so it reads as a downward triangle.
        <span
          aria-hidden
          data-geomap-part="tooltip-caret"
          style={{
            position: "absolute",
            left: "50%",
            bottom: -5,
            width: 9,
            height: 9,
            background: t.tooltipBg,
            borderRight: `1px solid ${border}`,
            borderBottom: `1px solid ${border}`,
            transform: "translateX(-50%) rotate(45deg)",
          }}
        />
      )}
    </div>
  );
}
