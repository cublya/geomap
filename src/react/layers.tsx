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
import { resolveOutline } from "../core/outline";
import { useGeo } from "./geo-context";
import { usePrefersReducedMotion } from "./use-reduced-motion";

const GRATICULE = geoGraticule10();

export function PatternDefs() {
  const { patternIds, theme, landFilterId, landShadowElevation = 1 } = useGeo();
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
      {landFilterId && (
        // Soft drop shadow that lifts the whole landmass silhouette off the
        // ocean for `outline="raised"`. Offsets are in viewBox units, scaled by
        // the outline's elevation.
        <filter id={landFilterId} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow
            dx={0}
            dy={0.7 * landShadowElevation}
            stdDeviation={0.9 * landShadowElevation}
            floodColor={theme.landShadow}
            floodOpacity={1}
          />
        </filter>
      )}
    </defs>
  );
}

export function GraticuleLayer() {
  const { path, theme } = useGeo();
  return (
    <path
      className="geomap-graticule"
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
  outline,
  selectedOutline,
  pattern,
  disabled,
  selectedId,
  onSelect,
  onHover,
  hover,
  nativeTitle,
}: CountriesLayerProps) {
  const { path, theme, isDraggingRef, patternIds, landFilterId } = useGeo();
  const reducedMotion = usePrefersReducedMotion();
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  // The shape the overlay draws over. Set on enter and *kept* on leave (unlike
  // `hoveredId`, which clears) so the highlight has something to fade out over.
  const [shownId, setShownId] = React.useState<string | null>(null);

  const shapes = React.useMemo(
    () =>
      data.countries
        .map((country) => ({ country, d: path(country.feature) }))
        .filter((s): s is { country: (typeof data.countries)[number]; d: string } => !!s.d),
    [data, path],
  );

  const interactive = !!(onSelect || onHover);
  // The hover highlight is a translucent overlay so it composes with any fill
  // (choropleths included) via the landHover token.
  const trackHover = interactive && theme.landHover !== undefined;

  // Native <title> gives a free browser tooltip, but it doubles up with a custom
  // GeoTooltip. So default it off precisely when the caller drives their own via
  // onHover; keep it otherwise. An explicit prop always wins.
  const showTitle = nativeTitle ?? onHover === undefined;

  // Fade config: `false` (or reduced motion) means an instant snap; otherwise a
  // short eased opacity transition drives the highlight in and out.
  const hoverMs = hover === false || reducedMotion ? 0 : (hover?.durationMs ?? 140);
  const hoverEasing = hover === false ? undefined : (hover?.easing ?? "ease-out");

  // A single overlay follows the hovered country instead of one path per shape,
  // and stays mounted (opacity 0) after leave so the fade-out can play.
  const shapeById = React.useMemo(() => new Map(shapes.map((s) => [s.country.id, s.d])), [shapes]);
  const overlayD = shownId != null ? shapeById.get(shownId) : undefined;

  return (
    <g
      className="geomap-countries"
      filter={landFilterId ? `url(#${landFilterId})` : undefined}
    >
      {shapes.map(({ country, d }) => {
        const isSelected = selectedId != null && country.id === selectedId;
        const isDisabled = disabled?.(country) ?? false;
        const resolvedFill = isDisabled
          ? theme.landDisabled
          : fill
            ? (fill(country) ?? theme.landMuted)
            : theme.land;
        const o = resolveOutline(
          typeof outline === "function" ? outline(country) : outline,
          theme,
        );
        const patternKind = isDisabled ? undefined : pattern?.(country);
        const hoverable = interactive && !isDisabled;
        return (
          <React.Fragment key={country.id}>
            <path
              className="geomap-country"
              d={d}
              fill={resolvedFill}
              stroke={o.color}
              strokeWidth={o.width}
              strokeDasharray={o.dash}
              vectorEffect="non-scaling-stroke"
              data-country={country.id}
              data-selected={isSelected ? "" : undefined}
              data-disabled={isDisabled ? "" : undefined}
              cursor={hoverable ? "pointer" : undefined}
              onClick={
                hoverable
                  ? (e) => {
                      e.stopPropagation();
                      if (!isDraggingRef.current) onSelect?.(country);
                    }
                  : isDisabled && interactive
                    ? // Fully inert: don't let the click fall through to the
                      // ocean handler and clear the selection.
                      (e) => e.stopPropagation()
                    : undefined
              }
              onPointerEnter={
                hoverable
                  ? (e) => {
                      if (isDraggingRef.current) return;
                      if (trackHover) {
                        setHoveredId(country.id);
                        setShownId(country.id);
                      }
                      onHover?.({ country, point: [e.clientX, e.clientY] });
                    }
                  : undefined
              }
              onPointerMove={
                hoverable && onHover
                  ? (e) => {
                      if (!isDraggingRef.current)
                        onHover({ country, point: [e.clientX, e.clientY] });
                    }
                  : undefined
              }
              onPointerLeave={
                hoverable
                  ? () => {
                      if (trackHover) setHoveredId((h) => (h === country.id ? null : h));
                      onHover?.(null);
                    }
                  : undefined
              }
            >
              {showTitle && <title>{country.name}</title>}
            </path>
            {patternKind && (
              <path
                className="geomap-pattern"
                d={d}
                fill={`url(#${patternKind === "hatch" ? patternIds.hatch : patternIds.dots})`}
                stroke="none"
                pointerEvents="none"
              />
            )}
          </React.Fragment>
        );
      })}
      {/* One highlight overlay, drawn over every country so it's never clipped by
          a later neighbour; it fades via opacity and follows the hovered shape. */}
      {trackHover && overlayD && (
        <path
          className="geomap-hover"
          d={overlayD}
          fill={theme.landHover}
          stroke="none"
          pointerEvents="none"
          style={{
            opacity: hoveredId != null ? 1 : 0,
            transition: hoverMs > 0 ? `opacity ${hoverMs}ms ${hoverEasing}` : undefined,
          }}
        />
      )}
      {/* Selected outline re-drawn last so neighbours don't overpaint it. */}
      {selectedId != null &&
        shapes
          .filter(({ country }) => country.id === selectedId)
          .map(({ country, d }) => {
            const so = resolveOutline(
              selectedOutline ?? { color: theme.selectedStroke, width: 1.2 },
              theme,
            );
            return (
              <path
                key={`${country.id}-selected`}
                className="geomap-selection"
                d={d}
                fill="none"
                stroke={so.color}
                strokeWidth={so.width}
                strokeDasharray={so.dash}
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            );
          })}
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
    <g className="geomap-markers">
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
              className="geomap-marker"
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
            className="geomap-marker"
            data-kind={marker.kind}
            transform={`translate(${position[0]} ${position[1]})`}
            {...clickProps}
          >
            <circle
              r={r}
              fill={color}
              stroke={theme.halo}
              strokeWidth={theme.halo ? 1.5 * counterScale : undefined}
              paintOrder="stroke"
            >
              {marker.label && <title>{marker.label}</title>}
            </circle>
            {marker.label && (
              <text
                className="geomap-label"
                x={r + 3 * counterScale}
                y={r}
                fontSize={9 * counterScale}
                fill={theme.markerLabel}
                stroke={theme.halo}
                strokeWidth={theme.halo ? 3 * counterScale : undefined}
                paintOrder="stroke"
                strokeLinejoin="round"
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
    <g className="geomap-routes" pointerEvents="none">
      {routes.map((route) => {
        if (route.stops.length < 2) return null;
        const d = path(routeLineString(route.stops));
        if (!d) return null;
        return (
          <path
            key={route.id}
            className="geomap-route"
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
    <g className="geomap-live-objects">
      {objects.map((object) => {
        const state = states.get(object.id) ?? liveTarget(object);
        const trailStops: Coordinate[] | undefined =
          object.trail && object.trail.length >= 2 ? object.trail : undefined;
        const position = project(state.position);
        const color = object.color ?? theme.live;
        return (
          <g key={object.id} className="geomap-live">
            {trailStops &&
              (() => {
                const trailD = path(routeLineString(trailStops)) ?? undefined;
                return (
                  <>
                    {theme.halo && (
                      // Casing: a wider halo-colored line under the trail so it
                      // reads over dark land as well as the ocean.
                      <path
                        className="geomap-trail-casing"
                        d={trailD}
                        fill="none"
                        stroke={theme.halo}
                        strokeWidth={2.5}
                        vectorEffect="non-scaling-stroke"
                        pointerEvents="none"
                      />
                    )}
                    <path
                      className="geomap-trail"
                      d={trailD}
                      fill="none"
                      stroke={object.color ?? theme.trail}
                      strokeWidth={1}
                      strokeOpacity={0.6}
                      vectorEffect="non-scaling-stroke"
                      pointerEvents="none"
                    />
                  </>
                );
              })()}
            {position &&
              (renderObject ? (
                <g transform={`translate(${position[0]} ${position[1]})`}>
                  {renderObject(object, { position, heading: state.heading, counterScale })}
                </g>
              ) : (
                <g transform={`translate(${position[0]} ${position[1]})`}>
                  <g transform={`rotate(${state.heading}) scale(${counterScale})`}>
                    {/* 's plane glyph: nose up, rotated by navigational heading.
                        A halo casing keeps it legible on dark land. */}
                    <path
                      className="geomap-live-icon"
                      d="M0,-7 L4.2,6 L0,3.2 L-4.2,6 Z"
                      fill={color}
                      stroke={theme.halo}
                      strokeWidth={theme.halo ? 1.6 : undefined}
                      paintOrder="stroke"
                      strokeLinejoin="round"
                    />
                  </g>
                  {object.label && (
                    <text
                      className="geomap-label"
                      x={9 * counterScale}
                      y={3 * counterScale}
                      fontSize={9 * counterScale}
                      fill={theme.markerLabel}
                      stroke={theme.halo}
                      strokeWidth={theme.halo ? 3 * counterScale : undefined}
                      paintOrder="stroke"
                      strokeLinejoin="round"
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
