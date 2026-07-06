import { describe, expect, it } from "vitest";
import { cx, darkTheme, lightTheme, resolveTheme, unstyledTheme } from "./theme";

describe("themes", () => {
  it("every built-in value is a --cublya-geo-* variable with a concrete fallback", () => {
    for (const theme of [lightTheme, darkTheme]) {
      for (const [key, value] of Object.entries(theme)) {
        expect(value, key).toMatch(/^var\(--cublya-geo-[a-z-]+, .+\)$/);
      }
    }
  });

  it("light and dark use the same variable names", () => {
    const names = (t: object) =>
      Object.values(t).map((v: string) => v.match(/--cublya-geo-[a-z-]+/)![0]);
    expect(names(lightTheme)).toEqual(names(darkTheme));
  });
});

describe("resolveTheme", () => {
  it("resolves modes", () => {
    expect(resolveTheme()).toBe(lightTheme);
    expect(resolveTheme("light")).toBe(lightTheme);
    expect(resolveTheme("dark")).toBe(darkTheme);
    expect(resolveTheme("unstyled")).toBe(unstyledTheme);
  });

  it("merges custom overrides over the light palette", () => {
    const theme = resolveTheme({ land: "#111" });
    expect(theme.land).toBe("#111");
    expect(theme.route).toBe(lightTheme.route);
  });

  it("unstyled has no values at all", () => {
    expect(Object.keys(unstyledTheme)).toHaveLength(0);
  });
});

describe("cx", () => {
  it("joins truthy class names", () => {
    expect(cx("a", undefined, false, "b", null)).toBe("a b");
  });
});
