"use client";

import { useEffect, useRef, type RefObject } from "react";

export interface ViewBoxSize {
  width: number;
  height: number;
}

/**
 * Convert client coordinates to viewBox coordinates, assuming
 * preserveAspectRatio="xMidYMid meet" (the components' default).
 */
export function clientToViewBox(
  svg: SVGSVGElement,
  viewBox: ViewBoxSize,
  clientX: number,
  clientY: number,
): [number, number] {
  const rect = svg.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return [0, 0];
  const scale = Math.min(rect.width / viewBox.width, rect.height / viewBox.height);
  const offsetX = (rect.width - viewBox.width * scale) / 2;
  const offsetY = (rect.height - viewBox.height * scale) / 2;
  return [(clientX - rect.left - offsetX) / scale, (clientY - rect.top - offsetY) / scale];
}

export interface GestureHandlers {
  /** Deltas in viewBox units. */
  onDrag: (dx: number, dy: number) => void;
  /** Velocity in viewBox units per frame, from the last move — for inertia. */
  onDragEnd?: (velocity: [number, number]) => void;
  /** Zoom factor around a viewBox point (wheel and pinch). */
  onZoomAt?: (factor: number, point: [number, number]) => void;
  onGestureStart?: () => void;
}

export interface PointerGestureOptions {
  enabled: boolean;
  wheelZoom: boolean;
  viewBox: ViewBoxSize;
  handlers: GestureHandlers;
  /** Set true while dragging so layers can suppress hover/click side effects. */
  isDraggingRef: RefObject<boolean>;
}

/** Pixels a pointer must travel before a press becomes a drag (keeps taps clickable). */
const DRAG_THRESHOLD_PX = 3;
const WHEEL_STEP = 1.15;

interface TrackedPointer {
  clientX: number;
  clientY: number;
}

/**
 * Unified mouse/touch/pen gestures on an SVG element: drag (with 's
 * deferred pointer capture so plain taps still click child paths), two-pointer
 * pinch zoom, and non-passive wheel zoom.
 */
export function usePointerGestures(
  svgRef: RefObject<SVGSVGElement | null>,
  { enabled, wheelZoom, viewBox, handlers, isDraggingRef }: PointerGestureOptions,
): void {
  // Keep latest values readable from stable listeners without re-binding.
  const stateRef = useRef({ enabled, wheelZoom, viewBox, handlers });
  useEffect(() => {
    stateRef.current = { enabled, wheelZoom, viewBox, handlers };
  });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const pointers = new Map<number, TrackedPointer>();
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let lastVelocity: [number, number] = [0, 0];
    let pinchDistance = 0;

    const vbScale = () => {
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return 1;
      const { viewBox: vb } = stateRef.current;
      return Math.min(rect.width / vb.width, rect.height / vb.height);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!stateRef.current.enabled) return;
      pointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
      startX = e.clientX;
      startY = e.clientY;
      lastVelocity = [0, 0];
      stateRef.current.handlers.onGestureStart?.();
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDistance = Math.hypot(a!.clientX - b!.clientX, a!.clientY - b!.clientY);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const tracked = pointers.get(e.pointerId);
      if (!tracked || !stateRef.current.enabled) return;

      if (pointers.size === 2) {
        tracked.clientX = e.clientX;
        tracked.clientY = e.clientY;
        const [a, b] = [...pointers.values()];
        const distance = Math.hypot(a!.clientX - b!.clientX, a!.clientY - b!.clientY);
        if (pinchDistance > 0 && distance > 0) {
          const mid = clientToViewBox(
            svg,
            stateRef.current.viewBox,
            (a!.clientX + b!.clientX) / 2,
            (a!.clientY + b!.clientY) / 2,
          );
          stateRef.current.handlers.onZoomAt?.(distance / pinchDistance, mid);
        }
        pinchDistance = distance;
        return;
      }

      const dxPx = e.clientX - tracked.clientX;
      const dyPx = e.clientY - tracked.clientY;
      if (!dragging) {
        const travelled = Math.hypot(e.clientX - startX, e.clientY - startY);
        if (travelled < DRAG_THRESHOLD_PX) return;
        // Capture only once a real drag starts, so a plain tap still delivers
        // its synthetic click to the country/marker underneath.
        dragging = true;
        isDraggingRef.current = true;
        svg.setPointerCapture(e.pointerId);
      }
      tracked.clientX = e.clientX;
      tracked.clientY = e.clientY;
      const scale = vbScale();
      const dx = dxPx / scale;
      const dy = dyPx / scale;
      lastVelocity = [dx, dy];
      stateRef.current.handlers.onDrag(dx, dy);
    };

    const endPointer = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      pinchDistance = 0;
      if (dragging && pointers.size === 0) {
        dragging = false;
        stateRef.current.handlers.onDragEnd?.(lastVelocity);
        // Cleared on the next tick so the drag's trailing click is still ignored.
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 0);
      }
    };

    const onWheel = (e: WheelEvent) => {
      const { enabled: on, wheelZoom: wheelOn, viewBox: vb, handlers: h } = stateRef.current;
      if (!on || !wheelOn || !h.onZoomAt) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP;
      h.onZoomAt(factor, clientToViewBox(svg, vb, e.clientX, e.clientY));
    };

    svg.addEventListener("pointerdown", onPointerDown);
    svg.addEventListener("pointermove", onPointerMove);
    svg.addEventListener("pointerup", endPointer);
    svg.addEventListener("pointercancel", endPointer);
    // Native listener: React registers wheel as passive, which blocks preventDefault.
    svg.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      svg.removeEventListener("pointerdown", onPointerDown);
      svg.removeEventListener("pointermove", onPointerMove);
      svg.removeEventListener("pointerup", endPointer);
      svg.removeEventListener("pointercancel", endPointer);
      svg.removeEventListener("wheel", onWheel);
    };
  }, [svgRef, isDraggingRef]);
}
