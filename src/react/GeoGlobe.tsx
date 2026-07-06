import * as React from "react";
import { geoDistance, geoPath } from "d3-geo";
import type {
  CountriesLayerProps,
  Coordinate,
  GeoMarker,
  GeoRoute,
  LonLat,
} from "../types";
import { toLonLat } from "../core/coords";
import { configureGlobe, createGlobeProjection } from "../core/projections";
import { createGlobeCamera, type GlobeCamera } from "../core/camera-globe";
import type { FitTarget } from "../core/camera-map";
import { cx, resolveTheme, type GeoThemeInput } from "../theme";
import { GeoProvider, type GeoContextValue } from "./geo-context";
import { usePointerGestures } from "./gestures";
import { usePrefersReducedMotion } from "./use-reduced-motion";
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

export interface GeoGlobeProps<TMarker = unknown, TRoute = unknown, TLive = unknown> {
  countries?: CountriesLayerProps;
  markers?: GeoMarker<TMarker>[];
  onMarkerClick?: MarkersLayerProps<TMarker>["onMarkerClick"];
  renderMarker?: MarkersLayerProps<TMarker>["renderMarker"];
  routes?: GeoRoute<TRoute>[];
  live?: LiveLayerComponentProps<TLive>;
  /** Camera handle from `useGlobeCamera()`; omitted → internal uncontrolled camera. */
  camera?: GlobeCamera;
  /** Declarative framing: rotate/zoom to the target whenever the value changes. */
  fit?: FitTarget;
  interactive?: boolean;
  wheelZoom?: boolean;
  keyboard?: boolean;
  /** Inertial spin after a drag release. Default true (skipped under reduced motion). */
  inertia?: boolean;
  /** Idle spin in degrees per second; pauses while interacting. Off by default. */
  autoRotate?: number;
  graticule?: boolean;
  /** "light" (default) | "dark" | "unstyled" | partial overrides of the light palette. */
  theme?: GeoThemeInput;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
  children?: React.ReactNode;
}

const KEYBOARD_ROTATE_DEG = 12;

function fitCoordinates(target: FitTarget): Coordinate[] {
  if (typeof target === "string") return [];
  if (Array.isArray(target)) {
    // GeoBounds is [[w,s],[e,n]] — treat both shapes as coordinate lists.
    return target as Coordinate[];
  }
  const [[west, south], [east, north]] = target.bounds;
  return [
    target.centroid,
    [west, south],
    [east, south],
    [east, north],
    [west, north],
  ];
}

function fitKey(fit: FitTarget | undefined): string {
  if (fit === undefined) return "";
  if (typeof fit === "string") return fit;
  if (Array.isArray(fit)) return JSON.stringify(fit);
  return `country:${fit.id}`;
}

export function GeoGlobe<TMarker = unknown, TRoute = unknown, TLive = unknown>({
  countries,
  markers,
  onMarkerClick,
  renderMarker,
  routes,
  live,
  camera: cameraProp,
  fit,
  interactive = true,
  wheelZoom = true,
  keyboard = true,
  inertia = true,
  autoRotate,
  graticule = true,
  theme: themeInput,
  width = 960,
  height = 540,
  className,
  style,
  "aria-label": ariaLabel = "Interactive globe",
  children,
}: GeoGlobeProps<TMarker, TRoute, TLive>) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const isDraggingRef = React.useRef(false);
  const patternBase = React.useId();
  const reducedMotion = usePrefersReducedMotion();

  const [fallbackCamera] = React.useState<GlobeCamera>(() => createGlobeCamera());
  const camera = cameraProp ?? fallbackCamera;

  const theme = React.useMemo(() => resolveTheme(themeInput), [themeInput]);

  const globe = React.useMemo(() => createGlobeProjection({ width, height }), [width, height]);

  const view = React.useSyncExternalStore(camera.subscribe, camera.getView, camera.getView);

  // Round the frame so tween frames with sub-threshold deltas reuse the memoised
  // projection/path ('s trick).
  const lambda = Math.round(view.rotation[0] * 2) / 2;
  const phi = Math.round(view.rotation[1] * 2) / 2;
  const gamma = Math.round(view.rotation[2] * 2) / 2;
  const zoom = Math.round(view.zoom * 100) / 100;

  const { projection, path } = React.useMemo(() => {
    const p = configureGlobe(globe, { width, height }, [lambda, phi, gamma], zoom);
    return { projection: p, path: geoPath(p) };
  }, [globe, width, height, lambda, phi, gamma, zoom]);

  const fitRef = React.useRef(fit);
  React.useEffect(() => {
    fitRef.current = fit;
  });
  const currentFitKey = fitKey(fit);
  React.useEffect(() => {
    const target = fitRef.current;
    if (target === undefined) return;
    if (target === "world") camera.reset();
    else camera.fitTo(fitCoordinates(target));
  }, [currentFitKey, camera]);

  const degPerPixel = 180 / (Math.PI * globe.baseScale * zoom);

  usePointerGestures(svgRef, {
    enabled: interactive,
    wheelZoom,
    viewBox: { width, height },
    isDraggingRef,
    handlers: {
      onGestureStart: () => camera.stopAnimations(),
      onDrag: (dx, dy) => camera.rotateBy(dx * degPerPixel, -dy * degPerPixel),
      onDragEnd: (velocity) => {
        if (inertia) {
          camera.startInertia([velocity[0] * degPerPixel, -velocity[1] * degPerPixel]);
        }
      },
      onZoomAt: (factor) => camera.set({ zoom: view.zoom * factor }),
    },
  });

  // Idle auto-rotation, paused during drags and disabled under reduced motion.
  React.useEffect(() => {
    if (!autoRotate || reducedMotion || typeof requestAnimationFrame !== "function") return;
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!isDraggingRef.current) camera.rotateBy(autoRotate * dt, 0);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [autoRotate, reducedMotion, camera]);

  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (!interactive || !keyboard) return;
    switch (e.key) {
      case "ArrowLeft":
        camera.rotateBy(KEYBOARD_ROTATE_DEG, 0);
        break;
      case "ArrowRight":
        camera.rotateBy(-KEYBOARD_ROTATE_DEG, 0);
        break;
      case "ArrowUp":
        camera.rotateBy(0, -KEYBOARD_ROTATE_DEG);
        break;
      case "ArrowDown":
        camera.rotateBy(0, KEYBOARD_ROTATE_DEG);
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

  const isVisible = React.useCallback(
    (c: Coordinate): boolean => {
      const center: LonLat = [-lambda, -phi];
      return geoDistance(toLonLat(c), center) <= Math.PI / 2 + 1e-6;
    },
    [lambda, phi],
  );

  const project = React.useCallback(
    (c: Coordinate): [number, number] | null => {
      if (!isVisible(c)) return null;
      const p = projection(toLonLat(c));
      return p && p.every(Number.isFinite) ? [p[0], p[1]] : null;
    },
    [projection, isVisible],
  );

  const context: GeoContextValue = React.useMemo(
    () => ({
      projection,
      path,
      size: { width, height },
      project,
      isVisible,
      counterScale: 1,
      theme,
      isDraggingRef,
      patternIds: { hatch: `${patternBase}hatch`, dots: `${patternBase}dots` },
    }),
    [projection, path, width, height, project, isVisible, theme, patternBase],
  );

  const sphereD = path({ type: "Sphere" }) ?? undefined;

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
      className={cx("cublya-geo", "cublya-geo-globe", className)}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        touchAction: interactive ? "none" : "auto",
        userSelect: "none",
        cursor: interactive ? "grab" : undefined,
        ...style,
      }}
    >
      <GeoProvider value={context}>
        <PatternDefs />
        <path
          className="cublya-geo-sphere"
          d={sphereD}
          fill={theme.ocean}
          stroke={theme.sphere}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
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
      </GeoProvider>
    </svg>
  );
}
