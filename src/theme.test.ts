import { describe, expect, it } from "vitest";
import { cx, presets, resolveTheme } from "./theme";

describe("presets", () => {
  it("exposes exactly light, dark, minimal, crisp and none", () => {
    expect(Object.keys(presets).sort()).toEqual(["crisp", "dark", "light", "minimal", "none"]);
  });

  it("styled presets wrap every token in a --geomap-* variable with a fallback", () => {
    for (const name of ["light", "dark", "minimal", "crisp"] as const) {
      const values = Object.values(presets[name]);
      expect(values.length).toBeGreaterThanOrEqual(22);
      for (const value of values) {
        expect(value, name).toMatch(/^var\(--geomap-[a-z-]+, .+\)$/);
      }
    }
  });

  it("uses OKLCH tokens — no raw #fff/#000 anywhere", () => {
    for (const preset of Object.values(presets)) {
      for (const value of Object.values(preset)) {
        expect(value).not.toMatch(/#fff\b|#ffffff|#000\b|#000000/i);
      }
    }
  });

  it("all styled presets define the same token set", () => {
    const keys = (p: object) => Object.keys(p).sort();
    expect(keys(presets.dark)).toEqual(keys(presets.light));
    expect(keys(presets.minimal)).toEqual(keys(presets.light));
    expect(keys(presets.crisp)).toEqual(keys(presets.light));
  });

  it("none is explicitly empty", () => {
    expect(Object.keys(presets.none)).toHaveLength(0);
  });
});

describe("resolveTheme", () => {
  it("defaults to the none preset (unstyled)", () => {
    expect(resolveTheme()).toBe(presets.none);
    expect(resolveTheme("light")).toBe(presets.light);
    expect(resolveTheme("dark")).toBe(presets.dark);
    expect(resolveTheme("none")).toBe(presets.none);
  });

  it("merges theme overrides over the preset (precedence steps 2→3)", () => {
    const theme = resolveTheme("dark", { land: "#123" });
    expect(theme.land).toBe("#123");
    expect(theme.route).toBe(presets.dark.route);
  });

  it("overrides over none give a from-scratch starting point", () => {
    const theme = resolveTheme("none", { land: "rebeccapurple" });
    expect(theme.land).toBe("rebeccapurple");
    expect(theme.route).toBeUndefined();
  });
});

describe("cx", () => {
  it("joins truthy class names", () => {
    expect(cx("a", undefined, false, "b", null)).toBe("a b");
  });
});
