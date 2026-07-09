import * as React from "react";
import {
  cx,
  GeoPreset,
  GeoPalette,
  type GeoTheme,
} from "../theme";
import { useControlSurface } from "./use-control-surface";

/** Structural subset shared by MapCamera and GlobeCamera. */
export interface CameraControlsHandle {
  zoomIn(): void;
  zoomOut(): void;
  reset(): void;
}

/** Per-part class hooks, the seam for Tailwind (or any utility CSS). */
export interface GeoControlsClassNames {
  /** The outer group (the button cluster / pill container). */
  root?: string;
  /** Applied to every button. */
  button?: string;
  /** Applied to the zoom-in button only (after `button`). */
  zoomIn?: string;
  /** Applied to the zoom-out button only (after `button`). */
  zoomOut?: string;
  /** Applied to the reset button only (after `button`). */
  reset?: string;
  /** Applied to the fullscreen button only (after `button`). */
  fullscreen?: string;
}

/**
 * Per-glyph render slots for {@link GeoControls}. Provide any subset to swap the
 * built-in inline SVG icons for your own nodes (an icon-library component, an
 * `<img>`, an emoji, …); unset slots keep the defaults. The package pulls in no
 * icon dependency; you bring the nodes.
 *
 * Slots are keyed per *glyph* so the fullscreen toggle stays correct:
 * `fullscreenEnter` shows while not fullscreen, `fullscreenExit` while fullscreen.
 */
export interface GeoControlsIcons {
  zoomIn?: React.ReactNode;
  zoomOut?: React.ReactNode;
  reset?: React.ReactNode;
  /** Fullscreen button while not fullscreen (press → enter). */
  fullscreenEnter?: React.ReactNode;
  /** Fullscreen button while fullscreen (press → exit). */
  fullscreenExit?: React.ReactNode;
}

/** Which surface {@link GeoViewToggle} / `<GeoView>` is showing. */
export const GeoViewMode = {
  Map: "map",
  Globe: "globe",
} as const;
export type GeoViewMode = (typeof GeoViewMode)[keyof typeof GeoViewMode];

/**
 * The element to toggle into fullscreen, usually the map's wrapping element.
 * Pass a ref (the common case), the element itself, or a getter.
 */
export type FullscreenTarget =
  | React.RefObject<HTMLElement | null>
  | HTMLElement
  | (() => HTMLElement | null);

export interface GeoControlsProps {
  /**
   * Drives the zoom-in / zoom-out / reset buttons. Omit it (e.g. on a static
   * choropleth with no camera) to render a fullscreen-only cluster; pass
   * `fullscreen` for that button to appear.
   */
  camera?: CameraControlsHandle;
  /**
   * Match the map's preset for a consistent look; default "none" renders bare,
   * style-free buttons so your own CSS/Tailwind owns 100% of the look.
   */
  preset?: GeoPreset;
  /** Match the map's styling variant. Defaults to "filled". */
  palette?: GeoPalette;
  /** Partial token overrides applied over the preset. */
  theme?: Partial<GeoTheme>;
  /** Stack direction of the button cluster. Defaults to "vertical". */
  orientation?: "vertical" | "horizontal";
  /**
   * How the buttons sit together:
   *   • `separate` (default): each button is its own rounded, shadowed tile
   *     with a small gap between them (the modern map-control look).
   *   • `segmented`: the buttons join into a single pill with hairline
   *     dividers and a shared shadow.
   */
  layout?: "separate" | "segmented";
  /**
   * Add a fullscreen toggle as the last button. Pass the element to make
   * fullscreen (typically a ref to the map's wrapper); omit to hide the button.
   * Uses the Fullscreen API and reflects the current state on
   * `aria-pressed` / `data-geomap-fullscreen`.
   */
  fullscreen?: FullscreenTarget;
  /**
   * Per-part class hooks for Tailwind / utility CSS. Combine with `preset="none"`
   * for full control (no inline styles to fight), or layer over a preset to tweak.
   */
  classNames?: GeoControlsClassNames;
  /**
   * Replace the built-in inline SVG glyphs with your own nodes, per glyph. Any
   * unset slot keeps the default icon. See {@link GeoControlsIcons}.
   */
  icons?: GeoControlsIcons;
  /** Convenience alias for `classNames.root`; both are applied. */
  className?: string;
  style?: React.CSSProperties;
  labels?: {
    zoomIn?: string;
    zoomOut?: string;
    reset?: string;
    enterFullscreen?: string;
    exitFullscreen?: string;
  };
}

type Key = "zoomIn" | "zoomOut" | "reset" | "fullscreen";
type IconKind =
  | "zoomIn"
  | "zoomOut"
  | "reset"
  | "fullscreenEnter"
  | "fullscreenExit"
  | "globe"
  | "map";

function Icon({ kind }: { kind: IconKind }) {
  return (
    <svg
      width="15"
      height="15"
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
      {kind === "fullscreenEnter" && (
        <path d="M6 2.5H3.5a1 1 0 0 0-1 1V6M10 2.5h2.5a1 1 0 0 1 1 1V6M13.5 10v2.5a1 1 0 0 1-1 1H10M6 13.5H3.5a1 1 0 0 1-1-1V10" />
      )}
      {kind === "fullscreenExit" && (
        <path d="M2.5 5.5H5a1 1 0 0 0 1-1V2M10 2v2.5a1 1 0 0 0 1 1h2.5M13.5 10.5H11a1 1 0 0 0-1 1V14M6 14v-2.5a1 1 0 0 0-1-1H2.5" />
      )}
      {kind === "globe" && (
        <>
          <circle cx="8" cy="8" r="5.5" />
          <path d="M2.5 8h11M8 2.5c1.9 1.5 1.9 9.5 0 11M8 2.5c-1.9 1.5-1.9 9.5 0 11" />
        </>
      )}
      {kind === "map" && (
        <path d="M2.5 4.3 6 3l4 1.7 3.5-1.3v8.3L10 13l-4-1.7-3.5 1.3zM6 3v8.3M10 4.7V13" />
      )}
    </svg>
  );
}

/** Soft elevation shared by the separate tiles and the segmented pill. */
const CONTROL_SHADOW =
  "0 1px 2px oklch(0.15 0.02 260 / 0.12), 0 6px 16px oklch(0.15 0.02 260 / 0.1)";

/**
 * Zoom-in / zoom-out / reset button cluster. By default the buttons render as
 * `separate` rounded, shadowed tiles; pass `layout="segmented"` to join them
 * into a single pill with hairline dividers. Icons are crisp inline SVG.
 *
 * Styling model (pick one, or mix):
 *   • `preset` → complete look out of the box via inline token styles, no CSS
 *     import required. Import `@cublya/geomap/styles.css` to add hover/focus polish.
 *   • `classNames` → per-part Tailwind/utility classes. Pair with `preset="none"`
 *     so nothing is inlined and your classes win outright.
 *   • `preset="none"` alone → headless: no inline styles, just the semantic
 *     `.geomap-controls*` classes plus `data-geomap-part` / `data-geomap-layout`
 *     hooks for raw CSS.
 *
 * Position it via `className`/`style`; it renders in normal flow.
 */
export function GeoControls({
  camera,
  preset = GeoPreset.None,
  palette = GeoPalette.Filled,
  theme,
  orientation = "vertical",
  layout = "separate",
  fullscreen,
  classNames,
  icons,
  className,
  style,
  labels,
}: GeoControlsProps) {
  const { t, styled } = useControlSurface(preset, palette, theme);
  const horizontal = orientation === "horizontal";
  const segmented = layout === "segmented";
  const border = t.controlBorder ?? "transparent";

  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const resolveFullscreenTarget = React.useCallback((): HTMLElement | null => {
    if (!fullscreen) return null;
    if (typeof fullscreen === "function") return fullscreen();
    if (typeof HTMLElement !== "undefined" && fullscreen instanceof HTMLElement) return fullscreen;
    return (fullscreen as React.RefObject<HTMLElement | null>).current;
  }, [fullscreen]);

  React.useEffect(() => {
    if (!fullscreen || typeof document === "undefined") return;
    const sync = () => {
      const el = resolveFullscreenTarget();
      setIsFullscreen(document.fullscreenElement != null && (el == null || document.fullscreenElement === el));
    };
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, [fullscreen, resolveFullscreenTarget]);

  const toggleFullscreen = React.useCallback(() => {
    if (typeof document === "undefined") return;
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
      return;
    }
    const el = resolveFullscreenTarget();
    void el?.requestFullscreen?.().catch(() => {});
  }, [resolveFullscreenTarget]);

  const buttons: Array<{
    key: Key;
    part: string;
    label: string;
    icon: IconKind;
    action: () => void;
    pressed?: boolean;
  }> = [];
  if (camera) {
    buttons.push(
      { key: "zoomIn", part: "zoom-in", label: labels?.zoomIn ?? "Zoom in", icon: "zoomIn", action: () => camera.zoomIn() },
      { key: "zoomOut", part: "zoom-out", label: labels?.zoomOut ?? "Zoom out", icon: "zoomOut", action: () => camera.zoomOut() },
      { key: "reset", part: "reset", label: labels?.reset ?? "Reset view", icon: "reset", action: () => camera.reset() },
    );
  }
  if (fullscreen) {
    buttons.push({
      key: "fullscreen",
      part: "fullscreen",
      label: isFullscreen
        ? labels?.exitFullscreen ?? "Exit fullscreen"
        : labels?.enterFullscreen ?? "Enter fullscreen",
      icon: isFullscreen ? "fullscreenExit" : "fullscreenEnter",
      action: toggleFullscreen,
      pressed: isFullscreen,
    });
  }

  let rootStyle: React.CSSProperties | undefined = style;
  if (styled) {
    const frame: React.CSSProperties = {
      display: "inline-flex",
      flexDirection: horizontal ? "row" : "column",
    };
    rootStyle = segmented
      ? {
          ...frame,
          background: t.controlBg,
          border: `1px solid ${border}`,
          borderRadius: 10,
          overflow: "hidden",
          boxShadow: CONTROL_SHADOW,
          ...style,
        }
      : { ...frame, gap: 5, ...style };
  }

  return (
    <div
      role="group"
      aria-label="Map controls"
      data-geomap-part="controls"
      data-geomap-orientation={orientation}
      data-geomap-layout={layout}
      className={cx("geomap-controls", classNames?.root, className)}
      style={rootStyle}
    >
      {buttons.map(({ key, part, label, icon, action, pressed }, i) => {
        let buttonStyle: React.CSSProperties | undefined;
        if (styled) {
          const base: React.CSSProperties = {
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 30,
            height: 30,
            padding: 0,
            color: t.controlInk,
            cursor: "pointer",
            transition: "background 120ms ease, box-shadow 120ms ease",
          };
          buttonStyle = segmented
            ? {
                ...base,
                border: "none",
                background: "transparent",
                ...(i > 0 &&
                  (horizontal
                    ? { borderLeft: `1px solid ${border}` }
                    : { borderTop: `1px solid ${border}` })),
              }
            : {
                ...base,
                background: t.controlBg,
                border: `1px solid ${border}`,
                borderRadius: 8,
                boxShadow: CONTROL_SHADOW,
              };
        }
        return (
          <button
            key={key}
            type="button"
            aria-label={label}
            aria-pressed={pressed}
            title={label}
            data-geomap-part={part}
            data-geomap-fullscreen={key === "fullscreen" ? (pressed ? "on" : "off") : undefined}
            className={cx("geomap-controls__button", classNames?.button, classNames?.[key])}
            onClick={action}
            style={buttonStyle}
          >
            {icons?.[icon as keyof GeoControlsIcons] ?? <Icon kind={icon} />}
          </button>
        );
      })}
    </div>
  );
}

/** Per-part class hooks for {@link GeoViewToggle}. */
export interface GeoViewToggleClassNames {
  /** The pill container (the radiogroup). */
  root?: string;
  /** Applied to both options. */
  option?: string;
  /** The flat-map option only (after `option`). */
  map?: string;
  /** The globe option only (after `option`). */
  globe?: string;
}

/** Per-glyph render slots for {@link GeoViewToggle}; unset slots keep the default SVG. */
export interface GeoViewToggleIcons {
  map?: React.ReactNode;
  globe?: React.ReactNode;
}

export interface GeoViewToggleProps {
  /** The surface currently shown. */
  mode: GeoViewMode;
  /** Called with the chosen surface when an option is pressed. */
  onModeChange: (mode: GeoViewMode) => void;
  /** Match the map's preset for a consistent look; default "none" renders bare. */
  preset?: GeoPreset;
  palette?: GeoPalette;
  theme?: Partial<GeoTheme>;
  /** Lay the two options in a row (default) or a column. */
  orientation?: "horizontal" | "vertical";
  classNames?: GeoViewToggleClassNames;
  /** Convenience alias for `classNames.root`; both are applied. */
  className?: string;
  /** Replace the built-in map/globe glyphs with your own nodes. */
  icons?: GeoViewToggleIcons;
  style?: React.CSSProperties;
  labels?: { map?: string; globe?: string };
}

/**
 * A segmented map⇄globe switch: two always-visible icon options (flat map and
 * globe) in a single pill, the active one highlighted, an ARIA `radiogroup`.
 * `<GeoView>` renders this for you; use it standalone to drive your own
 * `GeoMap`/`GeoGlobe` swap.
 *
 * Same styling model as {@link GeoControls}: `preset`/`theme` for a complete
 * inline look, `classNames` slots for Tailwind/utility CSS, or `preset="none"`
 * (headless) for just the semantic classes + `data-geomap-*` hooks
 * (`data-geomap-active` marks the selected option).
 */
export function GeoViewToggle({
  mode,
  onModeChange,
  preset = GeoPreset.None,
  palette = GeoPalette.Filled,
  theme,
  orientation = "horizontal",
  classNames,
  className,
  icons,
  style,
  labels,
}: GeoViewToggleProps) {
  const { t, styled } = useControlSurface(preset, palette, theme);
  const horizontal = orientation === "horizontal";
  const border = t.controlBorder ?? "transparent";

  const options: Array<{ id: GeoViewMode; label: string; icon: IconKind; slot?: string }> = [
    { id: GeoViewMode.Map, label: labels?.map ?? "Flat map", icon: "map", slot: classNames?.map },
    { id: GeoViewMode.Globe, label: labels?.globe ?? "Globe", icon: "globe", slot: classNames?.globe },
  ];

  let rootStyle: React.CSSProperties | undefined = style;
  if (styled) {
    rootStyle = {
      display: "inline-flex",
      flexDirection: horizontal ? "row" : "column",
      gap: 2,
      padding: 3,
      background: t.controlBg,
      border: `1px solid ${border}`,
      borderRadius: 12,
      boxShadow: CONTROL_SHADOW,
      ...style,
    };
  }

  return (
    <div
      role="radiogroup"
      aria-label="Map view"
      data-geomap-part="view-toggle"
      data-geomap-orientation={orientation}
      data-geomap-view={mode}
      className={cx("geomap-view-toggle", classNames?.root, className)}
      style={rootStyle}
    >
      {options.map(({ id, label, icon, slot }) => {
        const active = id === mode;
        let optionStyle: React.CSSProperties | undefined;
        if (styled) {
          optionStyle = {
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 30,
            height: 30,
            padding: 0,
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            transition: "background 120ms ease, color 120ms ease",
            color: active ? t.controlInk : `color-mix(in oklch, ${t.controlInk} 55%, transparent)`,
            background: active
              ? `color-mix(in oklch, ${t.controlInk} 12%, ${t.controlBg})`
              : "transparent",
            ...(active && { boxShadow: `inset 0 0 0 1px ${border}` }),
          };
        }
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            data-geomap-part={`view-toggle-${id}`}
            data-geomap-active={active ? "" : undefined}
            className={cx("geomap-view-toggle__option", classNames?.option, slot)}
            onClick={() => onModeChange(id)}
            style={optionStyle}
          >
            {icons?.[id] ?? <Icon kind={icon} />}
          </button>
        );
      })}
    </div>
  );
}
