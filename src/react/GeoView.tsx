import * as React from "react";
import type { CountriesLayerProps, GeoMarker, GeoRoute } from "../types";
import { createMapCamera, type FitTarget, type MapCamera } from "../core/camera-map";
import { createGlobeCamera, type GlobeCamera } from "../core/camera-globe";
import type { FlatProjectionOptions, ProjectionInput } from "../core/projections";
import {
  cx,
  GeoPreset,
  GeoPalette,
  type GeoTheme,
} from "../theme";
import { GeoMap } from "./GeoMap";
import { GeoGlobe } from "./GeoGlobe";
import {
  GeoControls,
  GeoViewMode,
  GeoViewToggle,
  type GeoControlsProps,
  type GeoViewToggleProps,
} from "./controls";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect";
import type { LiveLayerComponentProps, MarkersLayerProps } from "./layers";

export { GeoViewMode } from "./controls";

/** Linearly remap a zoom level from one camera's range to another's. */
function remapZoom(v: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  if (inMax <= inMin) return outMin;
  const t = (v - inMin) / (inMax - inMin);
  return outMin + Math.max(0, Math.min(1, t)) * (outMax - outMin);
}

export interface GeoViewProps<TMarker = unknown, TRoute = unknown, TLive = unknown> {
  countries?: CountriesLayerProps;
  markers?: GeoMarker<TMarker>[];
  onMarkerClick?: MarkersLayerProps<TMarker>["onMarkerClick"];
  renderMarker?: MarkersLayerProps<TMarker>["renderMarker"];
  routes?: GeoRoute<TRoute>[];
  live?: LiveLayerComponentProps<TLive>;
  /** Controlled surface. Provide with `onModeChange`; omit to run uncontrolled. */
  mode?: GeoViewMode;
  /** Initial surface when uncontrolled. Defaults to "map". */
  defaultMode?: GeoViewMode;
  /** Called with the next surface whenever the view toggle is pressed. */
  onModeChange?: (mode: GeoViewMode) => void;
  /** Reuse an external flat-map camera; omitted → an internal one is created. */
  mapCamera?: MapCamera;
  /** Reuse an external globe camera; omitted → an internal one is created. */
  globeCamera?: GlobeCamera;
  /** Declarative framing forwarded to whichever surface is active. */
  fit?: FitTarget;
  interactive?: boolean;
  wheelZoom?: boolean;
  keyboard?: boolean;
  graticule?: boolean;
  /** Flat-map only: projection kind or factory. Ignored on the globe. */
  projection?: ProjectionInput;
  /** Flat-map only: projection tuning. Ignored on the globe. */
  projectionOptions?: FlatProjectionOptions;
  /** Globe only: inertial spin after a drag release. Ignored on the map. */
  inertia?: boolean;
  /** Globe only: idle auto-rotation in deg/s. Ignored on the map. */
  autoRotate?: number;
  /** Colour mode shared by both surfaces and the controls. */
  preset?: GeoPreset;
  palette?: GeoPalette;
  theme?: Partial<GeoTheme>;
  width?: number;
  height?: number;
  /**
   * The overlaid map⇄globe {@link GeoViewToggle}. `true` (default) renders the
   * segmented switch top-left matching the preset; pass a partial
   * {@link GeoViewToggleProps} to reposition/restyle; `false` to render none and
   * drive the switch yourself via `mode`/`onModeChange`.
   */
  toggle?: boolean | Partial<GeoViewToggleProps>;
  /**
   * The overlaid zoom/reset cluster. `true` (default) renders it bottom-right
   * matching the preset; pass a partial {@link GeoControlsProps} to
   * reposition/restyle; `false` to render none.
   */
  controls?: boolean | Partial<GeoControlsProps>;
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
  /** Custom layers rendered inside the active surface's projection context. */
  children?: React.ReactNode;
}

/**
 * A single map that flips between a flat {@link GeoMap} and an orthographic
 * {@link GeoGlobe}, with a built-in segmented {@link GeoViewToggle}. The two
 * surfaces keep independent cameras, but the geographic centre and (range-scaled)
 * zoom carry across the switch, so flipping stays put instead of snapping home.
 *
 * Uncontrolled by default (`defaultMode`); pass `mode` + `onModeChange` to drive
 * it. Shared data (`countries`/`markers`/`routes`/`live`) and theming forward to
 * whichever surface is active; `projection*` apply only on the map and
 * `inertia`/`autoRotate` only on the globe.
 */
export function GeoView<TMarker = unknown, TRoute = unknown, TLive = unknown>({
  countries,
  markers,
  onMarkerClick,
  renderMarker,
  routes,
  live,
  mode,
  defaultMode = GeoViewMode.Map,
  onModeChange,
  mapCamera,
  globeCamera,
  fit,
  interactive,
  wheelZoom,
  keyboard,
  graticule,
  projection,
  projectionOptions,
  inertia,
  autoRotate,
  preset = GeoPreset.None,
  palette = GeoPalette.Filled,
  theme,
  width,
  height,
  toggle = true,
  controls = true,
  className,
  style,
  "aria-label": ariaLabel,
  children,
}: GeoViewProps<TMarker, TRoute, TLive>) {
  const [fallbackMap] = React.useState<MapCamera>(() => createMapCamera());
  const [fallbackGlobe] = React.useState<GlobeCamera>(() => createGlobeCamera());
  const map = mapCamera ?? fallbackMap;
  const globe = globeCamera ?? fallbackGlobe;

  const isControlled = mode !== undefined;
  const [internalMode, setInternalMode] = React.useState<GeoViewMode>(defaultMode);
  const currentMode = isControlled ? mode : internalMode;

  const changeMode = React.useCallback(
    (next: GeoViewMode) => {
      if (!isControlled) setInternalMode(next);
      onModeChange?.(next);
    },
    [isControlled, onModeChange],
  );

  // Carry the view across the switch. Run before paint (and before the incoming
  // surface's own layout effects settle) so the new camera is already framed on
  // the same place the old one showed (no home-snap flash). `set()` is instant.
  const prevModeRef = React.useRef(currentMode);
  useIsomorphicLayoutEffect(() => {
    const prev = prevModeRef.current;
    if (prev === currentMode) return;
    prevModeRef.current = currentMode;
    if (currentMode === GeoViewMode.Globe) {
      const { center, zoom } = map.getView();
      globe.set({
        rotation: [-center[0], -center[1], 0],
        zoom: remapZoom(zoom, map.minZoom, map.maxZoom, globe.minZoom, globe.maxZoom),
      });
    } else {
      const { rotation, zoom } = globe.getView();
      map.set({
        center: [-rotation[0], -rotation[1]],
        zoom: remapZoom(zoom, globe.minZoom, globe.maxZoom, map.minZoom, map.maxZoom),
      });
    }
  }, [currentMode, map, globe]);

  const toggleObj = typeof toggle === "object" ? toggle : undefined;
  const controlsObj = typeof controls === "object" ? controls : undefined;

  return (
    <div
      data-geomap-part="view"
      data-geomap-view={currentMode}
      className={cx("geomap-view", className)}
      // Fill the container so the child SVG (height:100%) has a height to resolve
      // against; otherwise the wrapper collapses and the map renders clipped.
      style={{ position: "relative", width: "100%", height: "100%", ...style }}
    >
      {currentMode === GeoViewMode.Map ? (
        <GeoMap
          camera={map}
          countries={countries}
          markers={markers}
          onMarkerClick={onMarkerClick}
          renderMarker={renderMarker}
          routes={routes}
          live={live}
          fit={fit}
          interactive={interactive}
          wheelZoom={wheelZoom}
          keyboard={keyboard}
          graticule={graticule}
          projection={projection}
          projectionOptions={projectionOptions}
          preset={preset}
          palette={palette}
          theme={theme}
          width={width}
          height={height}
          aria-label={ariaLabel}
        >
          {children}
        </GeoMap>
      ) : (
        <GeoGlobe
          camera={globe}
          countries={countries}
          markers={markers}
          onMarkerClick={onMarkerClick}
          renderMarker={renderMarker}
          routes={routes}
          live={live}
          fit={fit}
          interactive={interactive}
          wheelZoom={wheelZoom}
          keyboard={keyboard}
          graticule={graticule}
          inertia={inertia}
          autoRotate={autoRotate}
          preset={preset}
          palette={palette}
          theme={theme}
          width={width}
          height={height}
          aria-label={ariaLabel}
        >
          {children}
        </GeoGlobe>
      )}
      {toggle !== false && (
        <GeoViewToggle
          preset={preset}
          palette={palette}
          theme={theme}
          {...toggleObj}
          mode={currentMode}
          onModeChange={changeMode}
          style={{ position: "absolute", left: 12, top: 12, ...toggleObj?.style }}
        />
      )}
      {controls !== false && (
        <GeoControls
          preset={preset}
          palette={palette}
          theme={theme}
          {...controlsObj}
          camera={currentMode === GeoViewMode.Map ? map : globe}
          style={{ position: "absolute", right: 12, bottom: 12, ...controlsObj?.style }}
        />
      )}
    </div>
  );
}
