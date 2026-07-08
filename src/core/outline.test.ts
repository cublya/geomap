import { describe, expect, it } from "vitest";
import { resolveOutline } from "./outline";
import type { ResolvedGeoTheme } from "../theme";

const theme: ResolvedGeoTheme = {
  ocean: "OCEAN",
  land: "LAND",
  landStroke: "LANDSTROKE",
  landShadow: "SHADOW",
  selectedStroke: "SELECTED",
};

describe("resolveOutline", () => {
  it("defaults to the `line` mode (landStroke hairline, width 0.5)", () => {
    expect(resolveOutline(undefined, theme)).toEqual({
      color: "LANDSTROKE",
      width: 0.5,
      dash: undefined,
      raised: false,
      elevation: 1,
    });
    // A bare object with no mode is also `line`.
    expect(resolveOutline({}, theme).color).toBe("LANDSTROKE");
  });

  it("maps `gap` to the ocean tone so borders read as gaps", () => {
    const o = resolveOutline("gap", theme);
    expect(o.color).toBe("OCEAN");
    expect(o.raised).toBe(false);
  });

  it("maps `raised` to the ocean tone and flags the drop shadow", () => {
    const o = resolveOutline("raised", theme);
    expect(o.color).toBe("OCEAN");
    expect(o.raised).toBe(true);
  });

  it("maps `none` to no stroke", () => {
    expect(resolveOutline("none", theme).color).toBeUndefined();
  });

  it("lets explicit color/width/dash win over the mode-derived tone", () => {
    const o = resolveOutline({ mode: "gap", color: "#f00", width: 2, dash: "4 4" }, theme);
    expect(o).toMatchObject({ color: "#f00", width: 2, dash: "4 4" });
  });

  it("carries the elevation for raised shadows", () => {
    expect(resolveOutline({ mode: "raised", elevation: 2 }, theme).elevation).toBe(2);
  });
});
