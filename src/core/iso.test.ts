import { describe, expect, it } from "vitest";
import { ISO_3166_1 } from "./iso-data";
import { lookupIso, normalizeName, resolveCountryName } from "./iso";

describe("ISO_3166_1", () => {
  it("covers the full standard", () => {
    expect(ISO_3166_1.length).toBeGreaterThanOrEqual(249);
  });
});

describe("lookupIso", () => {
  it("resolves alpha-2, alpha-3 and numeric codes case-insensitively", () => {
    expect(lookupIso("US")?.name).toBe("United States of America");
    expect(lookupIso("usa")?.alpha2).toBe("US");
    expect(lookupIso("840")?.alpha2).toBe("US");
    expect(lookupIso(840)?.alpha2).toBe("US");
    expect(lookupIso("40")?.alpha2).toBe("AT");
    expect(lookupIso("de")?.alpha3).toBe("DEU");
  });

  it("returns undefined for unknown codes", () => {
    expect(lookupIso("ZZ")).toBeUndefined();
    expect(lookupIso("999")).toBeUndefined();
    expect(lookupIso("XKOS")).toBeUndefined();
  });
});

describe("normalizeName", () => {
  it("is accent, case, punctuation and separator insensitive", () => {
    expect(normalizeName("Côte d'Ivoire")).toBe("cote divoire");
    expect(normalizeName("  Timor-Leste ")).toBe("timor leste");
    expect(normalizeName("Dem. Rep. Congo")).toBe("dem rep congo");
  });
});

describe("resolveCountryName", () => {
  it("resolves ISO English short names", () => {
    expect(resolveCountryName("Germany")?.alpha2).toBe("DE");
    expect(resolveCountryName("United Arab Emirates")?.alpha2).toBe("AE");
  });

  it("resolves Natural Earth atlas abbreviations", () => {
    expect(resolveCountryName("Dem. Rep. Congo")?.alpha2).toBe("CD");
    expect(resolveCountryName("Bosnia and Herz.")?.alpha2).toBe("BA");
    expect(resolveCountryName("Czechia")?.alpha2).toBe("CZ");
    expect(resolveCountryName("S. Sudan")?.alpha2).toBe("SS");
    expect(resolveCountryName("United Kingdom")?.alpha2).toBe("GB");
    expect(resolveCountryName("Russia")?.alpha2).toBe("RU");
    expect(resolveCountryName("eSwatini")?.alpha2).toBe("SZ");
    expect(resolveCountryName("W. Sahara")?.alpha2).toBe("EH");
  });

  it("returns undefined for unknown names", () => {
    expect(resolveCountryName("Atlantis")).toBeUndefined();
  });
});
