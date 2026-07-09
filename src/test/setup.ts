import { vi } from "vitest";

const context2d = {
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  arc: vi.fn(),
  closePath: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  clip: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  setTransform: vi.fn(),
  setLineDash: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  isPointInPath: vi.fn(() => false),
};

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  configurable: true,
  value: vi.fn((contextId: string) => (contextId === "2d" ? context2d : null)),
});
