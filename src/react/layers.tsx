import * as React from "react";
import { geoGraticule10 } from "d3-geo";
import type {
  CountriesLayerProps,
  Coordinate,
  GeoMarker,
  GeoRoute,
  LiveObject,
  LonLat,
} from "../types";
import {
  interpolateGreatCircle,
  shortestAngleDelta,
  toLonLat,
} from "../core/coords";
import { routeLineString } from "../core/routes";
import { useGeo } from "./geo-context";
import { usePrefersReducedMotion } from "./use-reduced-motion";

const GRATICULE = geoGraticule10();

export function PatternDefs() {
  const { patternIds, theme } = useGeo();
  return (
    <defs>
      <pattern
        id={patternIds.hatch}
        width={6}
        height={6}
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line x1={0} y1={0} x2={0} y2={6} stroke={theme.patternInk} strokeWidth={1.4} />
      </pattern>
      <pattern id={patternIds.dots} width={7} height={7} patternUnits="userSpaceOnUse">
        <circle cx={2} cy={2} r={1.1} fill={theme.patternInk} />
      </pattern>
    </defs>
  );
}

export function GraticuleLayer() {
  const { path, theme } = useGeo();
  return (
    <path
      className="cublya-geo-graticule"
      d={path(GRATICULE) ?? undefined}
      fill="none"
      stroke={theme.graticule}
      strokeWidth={0.5}
      vectorEffect="non-scaling-stroke"
      pointerEvents="none"
    />
  );
}

export function CountriesLayer({
  data,
  fill,
  stroke,
  pattern,
  selectedId,
  onSelect,
  onHover,
}: CountriesLayerProps) {
  const { path, theme, isDraggingRef, patternIds } = useGeo();

  const shapes = React.useMemo(
    () =>
      data.countries
        .map((country) => ({ country, d: path(country.feature) }))
        .filter((s): s is { country: (typeof data.countries)[number]; d: string } => !!s.d),
    [data, path],
  );

  const interactive = !!(onSelect || onHover);

  return (
    <g className="cublya-geo-countries">
      {shapes.map(({ country, d }) => {
        const isSelected = selectedId != null && country.id === selectedId;
        const resolvedFill = fill ? (fill(country) ?? theme.landMuted) : theme.land;
        const patternKind = pattern?.(country);
        return (
          <React.Fragment key={country.id}>
            <path
              className="cublya-geo-country"
              d={d}
              fill={resolvedFill}
              stroke={isSelected ? theme.selectedStroke : (stroke ?? theme.landStroke)}
              strokeWidth={isSelected ? 1.2 : 0.5}
              vectorEffect="non-scaling-stroke"
              data-country={country.id}
              data-selected={isSelected ? "" : undefined}
              cursor={onSelect ? "pointer" : undefined}
              onClick={
                interactive
                  ? (e) => {
                      e.stopPropagation();
                      if (!isDraggingRef.current) onSelect?.(country);
                    }
                  : undefined
              }
              onPointerEnter={
                onHover
                  ? (e) => {
                      if (!isDraggingRef.current)
                        onHover({ country, point: [e.clientX, e.clientY] });
                    }
                  : undefined
              }
              onPointerMove={
                onHover
                  ? (e) => {
                      if (!isDraggingRef.current)
                        onHover({ country, point: [e.clientX, e.clientY] });
                    }
                  : undefined
              }
              onPointerLeave={onHover ? () => onHover(null) : undefined}
            >
              <title>{country.name}</title>
            </path>
            {patternKind && (
              <path
                className="cublya-geo-pattern"
                d={d}
                fill={`url(#${patternKind === "hatch" ? patternIds.hatch : patternIds.dots})`}
                stroke="none"
                pointerEvents="none"
              />
            )}
          </React.Fragment>
        );
      })}
      {/* Selected outline re-drawn last so neighbours don't overpaint it. */}
      {selectedId != null &&
        shapes
          .filter(({ country }) => country.id === selectedId)
          .map(({ country, d }) => (
            <path
              key={`${country.id}-selected`}
              className="cublya-geo-selection"
              d={d}
              fill="none"
              stroke={theme.selectedStroke}
              strokeWidth={1.2}
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          ))}
    </g>
  );
}

export interface MarkersLayerProps<T = unknown> {
  markers: GeoMarker<T>[];
  onMarkerClick?: (marker: GeoMarker<T>) => void;
  renderMarker?: (
    marker: GeoMarker<T>,
    ctx: { position: [number, number]; counterScale: number },
  ) => React.ReactNode;
}

export function MarkersLayer<T>({ markers, onMarkerClick, renderMarker }: MarkersLayerProps<T>) {
  const { project, theme, counterScale, isDraggingRef } = useGeo();
  return (
    <g className="cublya-geo-markers">
      {markers.map((marker) => {
        const position = project(marker.coordinates);
        if (!position) return null;
        const clickProps = onMarkerClick
          ? {
              cursor: "pointer",
              onClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                if (!isDraggingRef.current) onMarkerClick(marker);
              },
            }
          : undefined;
        if (renderMarker) {
          return (
            <g
              key={marker.id}
              className="cublya-geo-marker"
              data-kind={marker.kind}
              transform={`translate(${position[0]} ${position[1]})`}
              {...clickProps}
            >
              {renderMarker(marker, { position, counterScale })}
            </g>
          );
        }
        const r = (marker.size ?? 3) * counterScale;
        const color = marker.color ?? theme.marker;
        return (
          <g
            key={marker.id}
            className="cublya-geo-marker"
            data-kind={marker.kind}
            transform={`translate(${position[0]} ${position[1]})`}
            {...clickProps}
          >
            <circle r={r} fill={color} stroke="none">
              {marker.label && <title>{marker.label}</title>}
            </circle>
            {marker.label && (
              <text
                className="cublya-geo-label"
                x={r + 3 * counterScale}
                y={r}
                fontSize={9 * counterScale}
                fill={theme.markerLabel}
                pointerEvents="none"
              >
                {marker.label}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

export interface RoutesLayerProps<T = unknown> {
  routes: GeoRoute<T>[];
}

export function RoutesLayer<T>({ routes }: RoutesLayerProps<T>) {
  const { path, theme } = useGeo();
  return (
    <g className="cublya-geo-routes" pointerEvents="none">
      {routes.map((route) => {
        if (route.stops.length < 2) return null;
        const d = path(routeLineString(route.stops));
        if (!d) return null;
        return (
          <path
            key={route.id}
            className="cublya-geo-route"
            d={d}
            fill="none"
            stroke={route.color ?? theme.route}
            strokeWidth={route.width ?? 1.4}
            strokeOpacity={route.opacity ?? 0.9}
            strokeDasharray={route.dashed ? "4 4" : undefined}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </g>
  );
}

interface LiveState {
  position: LonLat;
  heading: number;
}

interface LiveAnimation {
  from: LiveState;
  to: LiveState;
  start: number;
  durationMs: number;
}

export interface LiveLayerComponentProps<T = unknown> {
  objects: LiveObject<T>[];
  /** Tween duration between successive position updates. Default 1000 ms. */
  transitionMs?: number;
  renderObject?: (
    object: LiveObject<T>,
    ctx: { position: [number, number]; heading: number; counterScale: number },
  ) => React.ReactNode;
}

function liveTarget(object: LiveObject<unknown>): LiveState {
  return { position: toLonLat(object.coordinates), heading: object.heading ?? 0 };
}

export function LiveLayer<T>({
  objects,
  transitionMs = 1000,
  renderObject,
}: LiveLayerComponentProps<T>) {
  const { project, path, theme, counterScale } = useGeo();
  const reducedMotion = usePrefersReducedMotion();

  const [states, setStates] = React.useState<ReadonlyMap<string, LiveState>>(new Map());
  const animsRef = React.useRef(new Map<string, LiveAnimation>());
  const rafRef = React.useRef(0);

  const stepAnimations = React.useCallback(function step() {
    rafRef.current = 0;
    const anims = animsRef.current;
    if (anims.size === 0) return;
    const now = performance.now();
    setStates((prev) => {
      const next = new Map(prev);
      for (const [id, anim] of anims) {
        const k = Math.min(1, (now - anim.start) / anim.durationMs);
        next.set(id, {
          position: interpolateGreatCircle(anim.from.position, anim.to.position, k),
          heading:
            anim.from.heading + shortestAngleDelta(anim.from.heading, anim.to.heading) * k,
        });
        if (k >= 1) anims.delete(id);
      }
      return next;
    });
    if (anims.size > 0 && rafRef.current === 0) {
      rafRef.current = requestAnimationFrame(step);
    }
  }, []);

  React.useEffect(() => {
    const anims = animsRef.current;
    const now = typeof performance !== "undefined" ? performance.now() : 0;
    const jump = transitionMs <= 0 || reducedMotion;
    setStates((prev) => {
      const next = new Map<string, LiveState>();
      for (const object of objects) {
        const target = liveTarget(object);
        const current = prev.get(object.id);
        if (!current || jump) {
          anims.delete(object.id);
          next.set(object.id, target);
          continue;
        }
        const moved =
          current.position[0] !== target.position[0] ||
          current.position[1] !== target.position[1] ||
          current.heading !== target.heading;
        const pending = anims.get(object.id);
        const alreadyHeadedThere =
          pending &&
          pending.to.position[0] === target.position[0] &&
          pending.to.position[1] === target.position[1] &&
          pending.to.heading === target.heading;
        if (moved && !alreadyHeadedThere) {
          anims.set(object.id, { from: current, to: target, start: now, durationMs: transitionMs });
        } else if (!moved) {
          anims.delete(object.id);
        }
        next.set(object.id, current);
      }
      return next;
    });
    for (const id of [...anims.keys()]) {
      if (!objects.some((o) => o.id === id)) anims.delete(id);
    }
    if (
      anims.size > 0 &&
      rafRef.current === 0 &&
      typeof requestAnimationFrame === "function"
    ) {
      rafRef.current = requestAnimationFrame(stepAnimations);
    }
  }, [objects, transitionMs, reducedMotion, stepAnimations]);

  React.useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  return (
    <g className="cublya-geo-live-objects">
      {objects.map((object) => {
        const state = states.get(object.id) ?? liveTarget(object);
        const trailStops: Coordinate[] | undefined =
          object.trail && object.trail.length >= 2 ? object.trail : undefined;
        const position = project(state.position);
        const color = object.color ?? theme.live;
        return (
          <g key={object.id} className="cublya-geo-live">
            {trailStops && (
              <path
                className="cublya-geo-trail"
                d={path(routeLineString(trailStops)) ?? undefined}
                fill="none"
                stroke={object.color ?? theme.trail}
                strokeWidth={1}
                strokeOpacity={0.6}
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            )}
            {position &&
              (renderObject ? (
                <g transform={`translate(${position[0]} ${position[1]})`}>
                  {renderObject(object, { position, heading: state.heading, counterScale })}
                </g>
              ) : (
                <g transform={`translate(${position[0]} ${position[1]})`}>
                  <g transform={`rotate(${state.heading}) scale(${counterScale})`}>
                    {/* 's plane glyph: nose up, rotated by navigational heading. */}
                    <path className="cublya-geo-live-icon" d="M0,-7 L4.2,6 L0,3.2 L-4.2,6 Z" fill={color} />
                  </g>
                  {object.label && (
                    <text
                      className="cublya-geo-label"
                      x={9 * counterScale}
                      y={3 * counterScale}
                      fontSize={9 * counterScale}
                      fill={theme.markerLabel}
                      pointerEvents="none"
                    >
                      {object.label}
                    </text>
                  )}
                </g>
              ))}
          </g>
        );
      })}
    </g>
  );
}
