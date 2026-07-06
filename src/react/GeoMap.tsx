"use client";

import * as React from "react";
import { geoPath } from "d3-geo";
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
  type FitTarget,
  type MapCamera,
} from "../core/camera-map";
import { mergeTheme, type GeoTheme } from "../theme";
import { GeoProvider, type GeoContextValue } from "./geo-context";
import { usePointerGestures } from "./gestures";
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
  interactive?: boolean;
  wheelZoom?: boolean;
  keyboard?: boolean;
  graticule?: boolean;
  theme?: Partial<GeoTheme>;
  /** viewBox size; the SVG itself fills its container. */
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
  children?: React.ReactNode;
}

function fitKey(fit: FitTarget | undefined): string {
  if (fit === undefined) return "";
  if (typeof fit === "string") return fit;
  if (Array.isArray(fit)) return JSON.stringify(fit);
  return `country:${fit.id}`;
}

const KEYBOARD_PAN_PX = 40;

export function GeoMap<TMarker = unknown, TRoute = unknown, TLive = unknown>({
  countries,
  markers,
  onMarkerClick,
  renderMarker,
  routes,
  live,
  projection: projectionInput = "naturalEarth1",
  projectionOptions,
  camera: cameraProp,
  fit,
  interactive = true,
  wheelZoom = true,
  keyboard = true,
  graticule = false,
  theme: themeOverrides,
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

  const theme = React.useMemo(() => mergeTheme(themeOverrides), [themeOverrides]);

  const projectionOptionsKey = JSON.stringify(projectionOptions ?? null);
  const projection = React.useMemo(
    () => createFlatProjection(projectionInput, { width, height }, projectionOptions),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- options keyed by value
    [projectionInput, width, height, projectionOptionsKey],
  );
  const path = React.useMemo(() => geoPath(projection), [projection]);

  React.useLayoutEffect(() => {
    camera.attachEnv({ projection, width, height });
    return () => camera.attachEnv(null);
  }, [camera, projection, width, height]);

  const view = React.useSyncExternalStore(camera.subscribe, camera.getView, camera.getView);

  const fitRef = React.useRef(fit);
  React.useEffect(() => {
    fitRef.current = fit;
  });
  const currentFitKey = fitKey(fit);
  React.useEffect(() => {
    if (fitRef.current !== undefined) camera.fitTo(fitRef.current);
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
    }),
    [projection, path, width, height, project, view.zoom, theme, patternBase],
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
      onClick={() => {
        if (!isDraggingRef.current) countries?.onSelect?.(null);
      }}
      className={className}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        touchAction: interactive ? "none" : "auto",
        userSelect: "none",
        cursor: interactive ? "grab" : undefined,
        background: theme.ocean === "transparent" ? undefined : theme.ocean,
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
