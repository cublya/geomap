import { describe, expect, it } from "vitest";
import { cx, presets, resolveTheme } from "./theme";

const MODES = ["light", "dark"] as const;
const VARIANTS = ["default", "minimal"] as const;

describe("presets", () => {
  it("exposes light & dark (each with all variants) and none", () => {
    expect(Object.keys(presets).sort()).toEqual(["dark", "light", "none"]);
    for (const mode of MODES) {
      expect(Object.keys(presets[mode]).sort()).toEqual([...VARIANTS].sort());
    }
  });

  it("styled presets wrap every token in a --geomap-* variable with a fallback", () => {
    for (const mode of MODES) {
      for (const variant of VARIANTS) {
        const values = Object.values(presets[mode][variant]);
        expect(values.length).toBeGreaterThanOrEqual(22);
        for (const value of values) {
          expect(value, `${mode}.${variant}`).toMatch(/^var\(--geomap-[a-z-]+, .+\)$/);
        }
      }
    }
  });

  it("uses OKLCH tokens — no raw #fff/#000 anywhere", () => {
    for (const mode of MODES) {
      for (const variant of VARIANTS) {
        for (const value of Object.values(presets[mode][variant])) {
          expect(value).not.toMatch(/#fff\b|#ffffff|#000\b|#000000/i);
        }
      }
    }
  });

  it("every mode × variant defines the same token set", () => {
    const keys = (p: object) => Object.keys(p).sort();
    const reference = keys(presets.light.default);
    for (const mode of MODES) {
      for (const variant of VARIANTS) {
        expect(keys(presets[mode][variant]), `${mode}.${variant}`).toEqual(reference);
      }
    }
  });

  it("none is explicitly empty", () => {
    expect(Object.keys(presets.none)).toHaveLength(0);
  });
});

describe("resolveTheme", () => {
  it("defaults to none, then resolves mode + variant", () => {
    expect(resolveTheme()).toBe(presets.none);
    expect(resolveTheme("none")).toBe(presets.none);
    expect(resolveTheme("light")).toBe(presets.light.default);
    expect(resolveTheme("dark")).toBe(presets.dark.default);
    expect(resolveTheme("light", "minimal")).toBe(presets.light.minimal);
    expect(resolveTheme("dark", "minimal")).toBe(presets.dark.minimal);
  });

  it("merges theme overrides over the preset (precedence steps 2→3)", () => {
    const theme = resolveTheme("dark", "minimal", { land: "#123" });
    expect(theme.land).toBe("#123");
    expect(theme.route).toBe(presets.dark.minimal.route);
  });

  it("overrides over none give a from-scratch starting point", () => {
    const theme = resolveTheme("none", "default", { land: "rebeccapurple" });
    expect(theme.land).toBe("rebeccapurple");
    expect(theme.route).toBeUndefined();
  });
});

describe("cx", () => {
  it("joins truthy class names", () => {
    expect(cx("a", undefined, false, "b", null)).toBe("a b");
  });
});
