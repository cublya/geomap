import * as React from "react";
import { geoGraticule10, geoPath } from "d3-geo";
import type { GeoPath, GeoProjection } from "d3-geo";
import { CountryPattern } from "../types";
import type {
  CountriesLayerProps,
  GeoMarker,
  GeoRoute,
  LiveObject,
  PreparedCountry,
} from "../types";
import {
  LIVE_DEFAULTS,
  MARKER_DEFAULTS,
  PATTERN_DEFAULTS,
  ROUTE_DEFAULTS,
} from "../core/overlay-defaults";
import { resolveCountryStyle, resolveSelectedOutline } from "../core/country-style";
import { routeLineString } from "../core/routes";
import type { ResolvedGeoTheme } from "../theme";
import { GeoProvider, type GeoContextValue } from "./geo-context";
import {
  LiveLayer,
  MarkersLayer,
  type LiveLayerComponentProps,
  type MarkersLayerProps,
} from "./layers";

const GRATICULE = geoGraticule10();

type CanvasMode = "map" | "globe";

interface CanvasCountryShape {
  country: PreparedCountry;
  path2d: Path2D;
}

export interface CanvasRendererProps<TMarker = unknown, TRoute = unknown, TLive = unknown> {
  mode: CanvasMode;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  context: GeoContextValue;
  projection: GeoProjection;
  path: GeoPath;
  width: number;
  height: number;
  mapTransform?: { tx: number; ty: number; zoom: number };
  sphereD?: string;
  countries?: CountriesLayerProps;
  markers?: GeoMarker<TMarker>[];
  onMarkerClick?: MarkersLayerProps<TMarker>["onMarkerClick"];
  renderMarker?: MarkersLayerProps<TMarker>["renderMarker"];
  routes?: GeoRoute<TRoute>[];
  live?: LiveLayerComponentProps<TLive>;
  graticule?: boolean;
  className: string;
  style?: React.CSSProperties;
  ariaLabel: string;
  interactive: boolean;
  keyboard: boolean;
  focusVisible: boolean;
  onKeyDown: (e: React.KeyboardEvent<HTMLCanvasElement>) => void;
  onFocus: (e: React.FocusEvent<HTMLCanvasElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLCanvasElement>) => void;
}

function path2dFrom(d: string): Path2D | undefined {
  if (typeof Path2D === "undefined") return undefined;
  try {
    return new Path2D(d);
  } catch {
    return undefined;
  }
}

function splitCssVar(value: string): { name: string; fallback?: string } | null {
  const match = value.match(/^var\((--[^,\s)]+)\s*(?:,\s*(.*))?\)$/);
  if (!match?.[1]) return null;
  return { name: match[1], fallback: match[2]?.trim() };
}

/** Resolves theme color strings (incl. `var(--x, fallback)`) to concrete values. */
type ColorResolver = (value: string | undefined) => string | undefined;

/**
 * Builds a resolver that reads the element's computed style once and caches each
 * distinct color string, so a full paint calls getComputedStyle once rather than
 * once per country/marker/route.
 */
function makeColorResolver(element: HTMLElement): ColorResolver {
  const computed = getComputedStyle(element);
  const cache = new Map<string, string | undefined>();
  return (value) => {
    if (!value) return undefined;
    if (cache.has(value)) return cache.get(value);
    const cssVar = splitCssVar(value);
    const resolved = cssVar
      ? computed.getPropertyValue(cssVar.name).trim() || cssVar.fallback
      : value;
    cache.set(value, resolved);
    return resolved;
  };
}

function applyFill(
  ctx: CanvasRenderingContext2D,
  resolve: ColorResolver,
  fill: string | undefined,
): boolean {
  const color = resolve(fill);
  if (!color) return false;
  ctx.fillStyle = color;
  return true;
}

function applyStroke(
  ctx: CanvasRenderingContext2D,
  resolve: ColorResolver,
  stroke: string | undefined,
): boolean {
  const color = resolve(stroke);
  if (!color) return false;
  ctx.strokeStyle = color;
  return true;
}

function drawGeo(
  ctx: CanvasRenderingContext2D,
  path: GeoPath,
  object: Parameters<GeoPath>[0],
  paint: () => void,
): void {
  ctx.beginPath();
  path(object);
  paint();
}

function drawPattern(
  ctx: CanvasRenderingContext2D,
  path2d: Path2D,
  bounds: [[number, number], [number, number]],
  kind: CountryPattern,
  theme: ResolvedGeoTheme,
  resolve: ColorResolver,
): void {
  const ink = resolve(theme.patternInk);
  if (!ink) return;
  const [[x0, y0], [x1, y1]] = bounds;
  ctx.save();
  ctx.clip(path2d);
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  if (kind === CountryPattern.Hatch) {
    const { spacing, strokeWidth } = PATTERN_DEFAULTS.hatch;
    ctx.lineWidth = strokeWidth;
    // Diagonal (slope -1) lines `x + y = c`, stepped across the feature's
    // bounding box rather than the whole canvas.
    for (let c = Math.floor((x0 + y0) / spacing) * spacing; c <= x1 + y1; c += spacing) {
      ctx.beginPath();
      ctx.moveTo(c - y0, y0);
      ctx.lineTo(c - y1, y1);
      ctx.stroke();
    }
  } else {
    const { spacing, radius, offset } = PATTERN_DEFAULTS.dots;
    // Dots on the global `offset + k*spacing` lattice, limited to the bbox so
    // the grid stays aligned between neighbouring countries.
    const startX = offset + Math.ceil((x0 - offset) / spacing) * spacing;
    const startY = offset + Math.ceil((y0 - offset) / spacing) * spacing;
    for (let x = startX; x < x1; x += spacing) {
      for (let y = startY; y < y1; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function strokeOutline(
  ctx: CanvasRenderingContext2D,
  resolve: ColorResolver,
  path2d: Path2D,
  outline: { color: string | undefined; width: number; dash: string | undefined },
  counterScale: number,
): void {
  if (!applyStroke(ctx, resolve, outline.color)) return;
  ctx.lineWidth = outline.width * counterScale;
  if (outline.dash) ctx.setLineDash(outline.dash.split(/\s+/).map(Number));
  ctx.stroke(path2d);
  ctx.setLineDash([]);
}

function drawCountries(
  ctx: CanvasRenderingContext2D,
  path: GeoPath,
  shapes: CanvasCountryShape[],
  resolve: ColorResolver,
  countries: CountriesLayerProps,
  theme: ResolvedGeoTheme,
  counterScale: number,
  hoveredId: string | null,
): void {
  // Reuse the same Path2D built for hit-testing so each country is projected
  // once per paint, not re-streamed through the projection here.
  const byId = new Map(shapes.map((s) => [s.country.id, s]));
  for (const { country, path2d } of shapes) {
    const { fill, outline, pattern } = resolveCountryStyle(country, countries, theme);
    if (applyFill(ctx, resolve, fill)) ctx.fill(path2d);
    strokeOutline(ctx, resolve, path2d, outline, counterScale);
    if (pattern) {
      drawPattern(ctx, path2d, path.bounds(country.feature), pattern, theme, resolve);
    }
  }

  if (hoveredId && theme.landHover) {
    const shape = byId.get(hoveredId);
    if (shape && applyFill(ctx, resolve, theme.landHover)) ctx.fill(shape.path2d);
  }

  if (countries.selectedId != null) {
    const shape = byId.get(countries.selectedId);
    if (shape) {
      strokeOutline(
        ctx,
        resolve,
        shape.path2d,
        resolveSelectedOutline(countries.selectedOutline, theme),
        counterScale,
      );
    }
  }
}

function drawRoutes<T>(
  ctx: CanvasRenderingContext2D,
  path: GeoPath,
  resolve: ColorResolver,
  routes: GeoRoute<T>[] | undefined,
  theme: ResolvedGeoTheme,
  counterScale: number,
): void {
  if (!routes) return;
  ctx.lineCap = "round";
  for (const route of routes) {
    if (route.stops.length < 2) continue;
    drawGeo(ctx, path, routeLineString(route.stops), () => {
      if (!applyStroke(ctx, resolve, route.color ?? theme.route)) return;
      ctx.globalAlpha = route.opacity ?? ROUTE_DEFAULTS.opacity;
      ctx.lineWidth = (route.width ?? ROUTE_DEFAULTS.width) * counterScale;
      if (route.dashed) ctx.setLineDash(ROUTE_DEFAULTS.dash.split(/\s+/).map(Number));
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
    });
  }
}

function drawMarkers<T>(
  ctx: CanvasRenderingContext2D,
  project: GeoContextValue["project"],
  resolve: ColorResolver,
  markers: GeoMarker<T>[] | undefined,
  theme: ResolvedGeoTheme,
  counterScale: number,
): void {
  if (!markers) return;
  for (const marker of markers) {
    // `project` culls globe-backface points (null), matching the SVG layer.
    const position = project(marker.coordinates);
    if (!position) continue;
    const r = (marker.size ?? MARKER_DEFAULTS.radius) * counterScale;
    if (theme.halo && applyStroke(ctx, resolve, theme.halo)) {
      ctx.lineWidth = MARKER_DEFAULTS.haloWidth * counterScale;
    }
    if (applyFill(ctx, resolve, marker.color ?? theme.marker)) {
      ctx.beginPath();
      ctx.arc(position[0], position[1], r, 0, Math.PI * 2);
      ctx.fill();
      if (theme.halo) ctx.stroke();
    }
    if (marker.label) {
      ctx.font = `${MARKER_DEFAULTS.labelFontSize * counterScale}px system-ui, sans-serif`;
      ctx.textBaseline = "alphabetic";
      const x = position[0] + r + MARKER_DEFAULTS.labelGap * counterScale;
      const y = position[1] + r;
      if (theme.halo && applyStroke(ctx, resolve, theme.halo)) {
        ctx.lineWidth = MARKER_DEFAULTS.labelHaloWidth * counterScale;
        ctx.lineJoin = "round";
        ctx.strokeText(marker.label, x, y);
      }
      if (applyFill(ctx, resolve, theme.markerLabel)) ctx.fillText(marker.label, x, y);
    }
  }
}

function drawLive<T>(
  ctx: CanvasRenderingContext2D,
  path: GeoPath,
  project: GeoContextValue["project"],
  resolve: ColorResolver,
  live: LiveLayerComponentProps<T> | undefined,
  theme: ResolvedGeoTheme,
  counterScale: number,
): void {
  if (!live) return;
  for (const object of live.objects as LiveObject<T>[]) {
    if (object.trail && object.trail.length >= 2) {
      if (theme.halo) {
        drawGeo(ctx, path, routeLineString(object.trail), () => {
          if (!applyStroke(ctx, resolve, theme.halo)) return;
          ctx.lineWidth = LIVE_DEFAULTS.trailCasingWidth * counterScale;
          ctx.stroke();
        });
      }
      drawGeo(ctx, path, routeLineString(object.trail), () => {
        if (!applyStroke(ctx, resolve, object.color ?? theme.trail)) return;
        ctx.globalAlpha = LIVE_DEFAULTS.trailOpacity;
        ctx.lineWidth = LIVE_DEFAULTS.trailWidth * counterScale;
        ctx.stroke();
        ctx.globalAlpha = 1;
      });
    }

    const position = project(object.coordinates);
    if (!position) continue;
    ctx.save();
    ctx.translate(position[0], position[1]);
    ctx.rotate(((object.heading ?? 0) * Math.PI) / 180);
    ctx.scale(counterScale, counterScale);
    ctx.beginPath();
    LIVE_DEFAULTS.glyph.forEach(([gx, gy], i) =>
      i === 0 ? ctx.moveTo(gx, gy) : ctx.lineTo(gx, gy),
    );
    ctx.closePath();
    if (applyFill(ctx, resolve, object.color ?? theme.live)) ctx.fill();
    if (theme.halo && applyStroke(ctx, resolve, theme.halo)) {
      ctx.lineWidth = LIVE_DEFAULTS.haloWidth;
      ctx.lineJoin = "round";
      ctx.stroke();
    }
    ctx.restore();
  }
}

function buildCountryShapes(
  countries: CountriesLayerProps | undefined,
  path: GeoPath,
): CanvasCountryShape[] {
  if (!countries) return [];
  const shapes: CanvasCountryShape[] = [];
  for (const country of countries.data.countries) {
    const d = path(country.feature);
    if (!d) continue;
    const path2d = path2dFrom(d);
    if (path2d) shapes.push({ country, path2d });
  }
  return shapes;
}

function hitCountry(
  ctx: CanvasRenderingContext2D | null,
  shapes: CanvasCountryShape[],
  point: [number, number],
): PreparedCountry | null {
  if (!ctx) return null;
  for (let i = shapes.length - 1; i >= 0; i -= 1) {
    const shape = shapes[i];
    if (shape?.path2d && ctx.isPointInPath(shape.path2d, point[0], point[1])) {
      return shape.country;
    }
  }
  return null;
}

function canvasPoint(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  event: React.PointerEvent | React.MouseEvent,
): [number, number] {
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return [0, 0];
  return [
    ((event.clientX - rect.left) / rect.width) * width,
    ((event.clientY - rect.top) / rect.height) * height,
  ];
}

function toPathPoint(
  point: [number, number],
  transform: CanvasRendererProps["mapTransform"],
): [number, number] {
  if (!transform) return point;
  return [(point[0] - transform.tx) / transform.zoom, (point[1] - transform.ty) / transform.zoom];
}

function toScreenPoint(
  point: [number, number],
  transform: CanvasRendererProps["mapTransform"],
): [number, number] {
  if (!transform) return point;
  return [transform.tx + point[0] * transform.zoom, transform.ty + point[1] * transform.zoom];
}

function hitMarker<T>(
  project: GeoContextValue["project"],
  markers: GeoMarker<T>[] | undefined,
  point: [number, number],
  transform: CanvasRendererProps["mapTransform"],
): GeoMarker<T> | null {
  if (!markers) return null;
  for (let i = markers.length - 1; i >= 0; i -= 1) {
    const marker = markers[i];
    if (!marker) continue;
    // Skip globe-backface markers so a far-side hit doesn't register.
    const projected = project(marker.coordinates);
    if (!projected) continue;
    const screen = toScreenPoint(projected, transform);
    const radius = marker.size ?? MARKER_DEFAULTS.radius;
    if (Math.hypot(point[0] - screen[0], point[1] - screen[1]) <= radius) return marker;
  }
  return null;
}

function CanvasOverlay<TMarker, TLive>({
  context,
  width,
  height,
  mapTransform,
  markers,
  onMarkerClick,
  renderMarker,
  live,
  children,
}: {
  context: GeoContextValue;
  width: number;
  height: number;
  mapTransform?: { tx: number; ty: number; zoom: number };
  markers?: GeoMarker<TMarker>[];
  onMarkerClick?: MarkersLayerProps<TMarker>["onMarkerClick"];
  renderMarker?: MarkersLayerProps<TMarker>["renderMarker"];
  live?: LiveLayerComponentProps<TLive>;
  children?: React.ReactNode;
}) {
  if (!renderMarker && !live?.renderObject && !children) return null;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "visible",
      }}
    >
      <GeoProvider value={context}>
        {/* Match the canvas's pan/zoom so custom SVG layers, which project into
            viewBox space, land in the same place as the drawn content. */}
        <g
          transform={
            mapTransform
              ? `translate(${mapTransform.tx} ${mapTransform.ty}) scale(${mapTransform.zoom})`
              : undefined
          }
        >
          {renderMarker && markers && (
            <MarkersLayer
              markers={markers}
              onMarkerClick={onMarkerClick}
              renderMarker={renderMarker}
            />
          )}
          {live?.renderObject && <LiveLayer {...live} />}
          {children}
        </g>
      </GeoProvider>
    </svg>
  );
}

export function CanvasRenderer<TMarker = unknown, TRoute = unknown, TLive = unknown>({
  mode,
  canvasRef,
  context,
  projection,
  path,
  width,
  height,
  mapTransform,
  sphereD,
  countries,
  markers,
  onMarkerClick,
  renderMarker,
  routes,
  live,
  graticule,
  className,
  style,
  ariaLabel,
  interactive,
  keyboard,
  focusVisible,
  onKeyDown,
  onFocus,
  onBlur,
  children,
}: React.PropsWithChildren<CanvasRendererProps<TMarker, TRoute, TLive>>) {
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  const shapes = React.useMemo(() => buildCountryShapes(countries, path), [countries, path]);
  const pathCtxRef = React.useRef<CanvasRenderingContext2D | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    pathCtxRef.current = ctx;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const canvasPath = geoPath(projection, ctx);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const resolve = makeColorResolver(canvas);
    // The map applies pan/zoom via the ctx transform, so line widths need the
    // inverse (counterScale) to stay device-constant; the globe has no such
    // transform and draws at unit scale.
    const counterScale = mode === "map" ? context.counterScale : 1;

    if (mode === "map") {
      if (applyFill(ctx, resolve, context.theme.ocean)) ctx.fillRect(0, 0, width, height);
    } else if (sphereD) {
      drawGeo(ctx, canvasPath, { type: "Sphere" }, () => {
        if (applyFill(ctx, resolve, context.theme.ocean)) ctx.fill();
        if (applyStroke(ctx, resolve, context.theme.sphere)) {
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
    }

    ctx.save();
    if (mapTransform) {
      ctx.translate(mapTransform.tx, mapTransform.ty);
      ctx.scale(mapTransform.zoom, mapTransform.zoom);
    }
    if (graticule) {
      drawGeo(ctx, canvasPath, GRATICULE, () => {
        if (!applyStroke(ctx, resolve, context.theme.graticule)) return;
        ctx.lineWidth = 0.5 * counterScale;
        ctx.stroke();
      });
    }
    if (countries) {
      drawCountries(ctx, path, shapes, resolve, countries, context.theme, counterScale, hoveredId);
    }
    drawRoutes(ctx, canvasPath, resolve, routes, context.theme, counterScale);
    if (!renderMarker) drawMarkers(ctx, context.project, resolve, markers, context.theme, counterScale);
    if (!live?.renderObject) drawLive(ctx, canvasPath, context.project, resolve, live, context.theme, counterScale);
    ctx.restore();
  }, [
    canvasRef,
    context,
    countries,
    graticule,
    height,
    hoveredId,
    live,
    mapTransform,
    markers,
    mode,
    path,
    projection,
    renderMarker,
    routes,
    shapes,
    sphereD,
    width,
  ]);

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive || !countries) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = toPathPoint(canvasPoint(canvas, width, height, e), mapTransform);
    const country = hitCountry(pathCtxRef.current, shapes, point);
    const isDisabled = country ? (countries.disabled?.(country) ?? false) : false;
    const nextId = country && !isDisabled ? country.id : null;
    setHoveredId(nextId);
    if (countries.onHover) {
      countries.onHover(country && !isDisabled ? { country, point: [e.clientX, e.clientY] } : null);
    }
  };

  const onPointerLeave = () => {
    setHoveredId(null);
    countries?.onHover?.(null);
  };

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rawPoint = canvasPoint(canvas, width, height, e);
    if (!renderMarker && onMarkerClick) {
      const marker = hitMarker(context.project, markers, rawPoint, mapTransform);
      if (marker) {
        onMarkerClick(marker);
        return;
      }
    }
    if (!countries) return;
    const point = toPathPoint(rawPoint, mapTransform);
    const country = hitCountry(pathCtxRef.current, shapes, point);
    if (!country) {
      countries.onSelect?.(null);
      return;
    }
    if (countries.disabled?.(country)) return;
    countries.onSelect?.(country);
  };

  const canvasStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    height: "100%",
    touchAction: interactive ? "none" : "auto",
    userSelect: "none",
    cursor: interactive ? "grab" : undefined,
    outline: context.theme.focus !== undefined && focusVisible ? `2px solid ${context.theme.focus}` : undefined,
    outlineOffset: 2,
    ...style,
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={ariaLabel}
        width={width}
        height={height}
        tabIndex={interactive && keyboard ? 0 : undefined}
        className={className}
        style={canvasStyle}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onClick={onClick}
      />
      <CanvasOverlay
        context={context}
        width={width}
        height={height}
        mapTransform={mapTransform}
        markers={markers}
        onMarkerClick={onMarkerClick}
        renderMarker={renderMarker}
        live={live}
        children={children}
      />
    </div>
  );
}
