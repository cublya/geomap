export type Cancel = () => void;

export function easeInOutQuad(k: number): number {
  return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const hasRaf = () =>
  typeof globalThis.requestAnimationFrame === "function" &&
  typeof globalThis.cancelAnimationFrame === "function";

export interface TweenOptions {
  durationMs?: number;
  ease?: (k: number) => number;
  /** Jump straight to the end (set automatically under reduced motion by callers). */
  immediate?: boolean;
  onUpdate: (k: number) => void;
  onDone?: () => void;
}

/**
 * rAF tween emitting an eased 0→1 progress. Falls back to an immediate jump when
 * rAF is unavailable (SSR) or `immediate` is set.
 */
export function tween({
  durationMs = 600,
  ease = easeInOutQuad,
  immediate = false,
  onUpdate,
  onDone,
}: TweenOptions): Cancel {
  if (immediate || !hasRaf() || durationMs <= 0) {
    onUpdate(1);
    onDone?.();
    return () => {};
  }
  let frame = 0;
  const t0 = performance.now();
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / durationMs);
    onUpdate(ease(k));
    if (k < 1) frame = requestAnimationFrame(step);
    else onDone?.();
  };
  frame = requestAnimationFrame(step);
  return () => cancelAnimationFrame(frame);
}

export interface DecayOptions {
  velocity: [number, number];
  /** Per-frame velocity multiplier; 0.92 gives a natural spin-down. */
  decay?: number;
  /** Stop when speed falls below this. */
  minSpeed?: number;
  onStep: (dx: number, dy: number) => void;
}

/** Inertia loop: applies a decaying velocity each frame until it stalls. */
export function startDecay({ velocity, decay = 0.92, minSpeed = 0.02, onStep }: DecayOptions): Cancel {
  if (!hasRaf()) return () => {};
  let [vx, vy] = velocity;
  let frame = 0;
  const step = () => {
    vx *= decay;
    vy *= decay;
    if (Math.hypot(vx, vy) < minSpeed) return;
    onStep(vx, vy);
    frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  return () => cancelAnimationFrame(frame);
}
