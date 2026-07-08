import * as React from "react";
import { geoPath } from "d3-geo";
import { FlatProjectionKind } from "../types";
import type {
  CountriesLayerProps,
  Coordinate,
  GeoMarker,
  GeoRoute,
} from "../types";
import { toLonLat } from "../core/coords";
import {
  createFlatProjection,
  type FlatProjectionOptions,
  type ProjectionInput,
} from "../core/projections";
import {
  createMapCamera,
  fitKey,
  type FitTarget,
  type FlyCurve,
  type MapCamera,
} from "../core/camera-map";
import {
  cx,
  resolveTheme,
  GeoPreset,
  GeoPalette,
  type GeoTheme,
} from "../theme";
import { resolveLandShadow } from "../core/outline";
import { GeoProvider, type GeoContextValue } from "./geo-context";
import { usePointerGestures } from "./gestures";
import { useFocusVisible } from "./use-focus-visible";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect";
import {
  CountriesLayer,
  GraticuleLayer,
  LiveLayer,
  MarkersLayer,
  PatternDefs,
  RoutesLayer,
  type LiveLayerComponentProps,
  type MarkersLayerProps,
} from "./layers";

export interface GeoMapProps<TMarker = unknown, TRoute = unknown, TLive = unknown> {
  countries?: CountriesLayerProps;
  markers?: GeoMarker<TMarker>[];
  onMarkerClick?: MarkersLayerProps<TMarker>["onMarkerClick"];
  renderMarker?: MarkersLayerProps<TMarker>["renderMarker"];
  routes?: GeoRoute<TRoute>[];
  live?: LiveLayerComponentProps<TLive>;
  /** Flat projection: a named kind or a factory receiving the viewBox size. */
  projection?: ProjectionInput;
  projectionOptions?: FlatProjectionOptions;
  /** Camera handle from `useMapCamera()`; omitted → internal uncontrolled camera. */
  camera?: MapCamera;
  /** Declarative refit whenever the value changes; `camera.fitTo` is the imperative twin. */
  fit?: FitTarget;
  /** Animation curve for the declarative `fit`. `"arc"` (default) zooms out/pans/zooms in; `"linear"` interpolates directly. */
  fitCurve?: FlyCurve;
  interactive?: boolean;
  wheelZoom?: boolean;
  keyboard?: boolean;
  graticule?: boolean;
  /** Colour mode: "none" (default, unstyled) | "light" | "dark". */
  preset?: GeoPreset;
  /** Fill palette over the mode: "default" | "minimal". Border behaviour is `countries.outline`. */
  palette?: GeoPalette;
  /** Partial token overrides applied over the preset. */
  theme?: Partial<GeoTheme>;
  /** viewBox size; the SVG itself fills its container. */
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
  children?: React.ReactNode;
}

const KEYBOARD_PAN_PX = 40;

export function GeoMap<TMarker = unknown, TRoute = unknown, TLive = unknown>({
  countries,
  markers,
  onMarkerClick,
  renderMarker,
  routes,
  live,
  projection: projectionInput = FlatProjectionKind.NaturalEarth1,
  projectionOptions,
  camera: cameraProp,
  fit,
  fitCurve,
  interactive = true,
  wheelZoom = true,
  keyboard = true,
  graticule = false,
  preset = GeoPreset.None,
  palette = GeoPalette.Default,
  theme: themeInput,
  width = 960,
  height = 500,
  className,
  style,
  "aria-label": ariaLabel = "Interactive map",
  children,
}: GeoMapProps<TMarker, TRoute, TLive>) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const isDraggingRef = React.useRef(false);
  const patternBase = React.useId();

  const [fallbackCamera] = React.useState<MapCamera>(() => createMapCamera());
  const camera = cameraProp ?? fallbackCamera;

  const theme = React.useMemo(
    () => resolveTheme(preset, palette, themeInput),
    [preset, palette, themeInput],
  );
  const { focusVisible, onFocus, onBlur } = useFocusVisible();

  const projectionOptionsKey = JSON.stringify(projectionOptions ?? null);
  const projection = React.useMemo(
    () => createFlatProjection(projectionInput, { width, height }, projectionOptions),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- options keyed by value
    [projectionInput, width, height, projectionOptionsKey],
  );
  const path = React.useMemo(() => geoPath(projection), [projection]);

  useIsomorphicLayoutEffect(() => {
    camera.attachEnv({ projection, width, height });
    return () => camera.attachEnv(null);
  }, [camera, projection, width, height]);

  const view = React.useSyncExternalStore(camera.subscribe, camera.getView, camera.getView);

  const fitRef = React.useRef(fit);
  const fitCurveRef = React.useRef(fitCurve);
  React.useEffect(() => {
    fitRef.current = fit;
    fitCurveRef.current = fitCurve;
  });
  const currentFitKey = fitKey(fit);
  React.useEffect(() => {
    if (fitRef.current !== undefined)
      camera.fitTo(fitRef.current, { curve: fitCurveRef.current });
  }, [currentFitKey, camera]);

  usePointerGestures(svgRef, {
    enabled: interactive,
    wheelZoom,
    viewBox: { width, height },
    isDraggingRef,
    handlers: {
      onGestureStart: () => camera.stopAnimations(),
      onDrag: (dx, dy) => camera.panBy(dx, dy),
      onZoomAt: (factor, point) => camera.zoomAtPixel(factor, point),
    },
  });

  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (!interactive || !keyboard) return;
    switch (e.key) {
      case "ArrowLeft":
        camera.panBy(KEYBOARD_PAN_PX, 0);
        break;
      case "ArrowRight":
        camera.panBy(-KEYBOARD_PAN_PX, 0);
        break;
      case "ArrowUp":
        camera.panBy(0, KEYBOARD_PAN_PX);
        break;
      case "ArrowDown":
        camera.panBy(0, -KEYBOARD_PAN_PX);
        break;
      case "+":
      case "=":
        camera.zoomIn();
        break;
      case "-":
      case "_":
        camera.zoomOut();
        break;
      case "Home":
      case "0":
        camera.reset();
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const project = React.useCallback(
    (c: Coordinate): [number, number] | null => {
      const p = projection(toLonLat(c));
      return p && p.every(Number.isFinite) ? [p[0], p[1]] : null;
    },
    [projection],
  );

  const landShadow = React.useMemo(
    () => resolveLandShadow(countries?.outline, theme),
    [countries?.outline, theme],
  );
  const landFilterId = landShadow ? `${patternBase}relief` : undefined;

  const context: GeoContextValue = React.useMemo(
    () => ({
      projection,
      path,
      size: { width, height },
      project,
      isVisible: (c) => project(c) != null,
      counterScale: 1 / view.zoom,
      theme,
      isDraggingRef,
      patternIds: { hatch: `${patternBase}hatch`, dots: `${patternBase}dots` },
      landFilterId,
      landShadow,
    }),
    [projection, path, width, height, project, view.zoom, theme, patternBase, landFilterId, landShadow],
  );

  // Transform is derived directly from the projection so the first paint is
  // correct even before the camera env attaches.
  const projectedCenter = projection(view.center) ?? [width / 2, height / 2];
  const tx = width / 2 - view.zoom * projectedCenter[0];
  const ty = height / 2 - view.zoom * projectedCenter[1];

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
      tabIndex={interactive && keyboard ? 0 : undefined}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      onClick={() => {
        if (!isDraggingRef.current) countries?.onSelect?.(null);
      }}
      className={cx("geomap", "geomap-map", className)}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        touchAction: interactive ? "none" : "auto",
        userSelect: "none",
        cursor: interactive ? "grab" : undefined,
        background: theme.ocean,
        // Themed keyboard-focus ring; with no focus token the browser default stays.
        ...(theme.focus !== undefined && {
          outline: focusVisible ? `2px solid ${theme.focus}` : "none",
          outlineOffset: 2,
        }),
        ...style,
      }}
    >
      <GeoProvider value={context}>
        <PatternDefs />
        <g transform={`translate(${tx} ${ty}) scale(${view.zoom})`}>
          {graticule && <GraticuleLayer />}
          {countries && <CountriesLayer {...countries} />}
          {routes && routes.length > 0 && <RoutesLayer routes={routes} />}
          {markers && markers.length > 0 && (
            <MarkersLayer
              markers={markers}
              onMarkerClick={onMarkerClick}
              renderMarker={renderMarker}
            />
          )}
          {live && <LiveLayer {...live} />}
          {children}
        </g>
      </GeoProvider>
    </svg>
  );
}
