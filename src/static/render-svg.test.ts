import { describe, expect, it } from "vitest";
import type { Topology } from "topojson-specification";
import world110 from "@cublya/world-atlas/countries-110m.json";
import { prepareCountries } from "../core/geodata";
import { escapeXml, renderStaticMapSvg, svgToDataUrl } from "./render-svg";

const world = prepareCountries(world110 as unknown as Topology, { exclude: ["AQ"] });

describe("renderStaticMapSvg", () => {
  it("renders countries, routes and markers into a standalone SVG string", () => {
    const svg = renderStaticMapSvg({
      width: 1080,
      height: 1080,
      background: "#f6f6f6",
      countries: {
        data: world,
        fill: (c) => (c.id === "de" ? "#3355ff" : undefined),
      },
      routes: [
        { id: "r1", stops: [{ lat: 52.5, lng: 13.4 }, { lat: 40.7, lng: -74 }], dashed: true },
      ],
      markers: [{ id: "ber", coordinates: [13.4, 52.5], label: "Berlin & Co" }],
    });

    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
    expect(svg).toContain('fill="#3355ff"');
    expect(svg).toContain('stroke-dasharray="4 4"');
    expect(svg).toContain("Berlin &amp; Co");
    expect(svg).not.toContain("NaN");
    // One path per country plus background, route and marker elements.
    expect(svg.split("<path").length).toBeGreaterThan(world.countries.length);
  });

  it("strokes country borders in the ocean tone for outline=gap", () => {
    const svg = renderStaticMapSvg({
      width: 400,
      height: 200,
      preset: "light",
      countries: { data: world, outline: "gap" },
    });
    // gap borders take the ocean fallback tone, not the landStroke tone.
    expect(svg).toContain('stroke="var(--geomap-ocean');
    expect(svg).not.toContain("var(--geomap-relief");
    expect(svg).not.toContain("feDropShadow");
  });

  it("emits a drop-shadow filter for outline=raised", () => {
    const svg = renderStaticMapSvg({
      width: 400,
      height: 200,
      preset: "light",
      countries: { data: world, outline: { mode: "raised", elevation: 2 } },
    });
    expect(svg).toContain("feDropShadow");
    expect(svg).toContain('filter="url(#geomap-relief)"');
    // Elevation scales the shadow offset (0.7 * 2).
    expect(svg).toContain('dy="1.4"');
  });

  it("applies a per-country outline callback", () => {
    const svg = renderStaticMapSvg({
      width: 400,
      height: 200,
      preset: "light",
      countries: {
        data: world,
        outline: (c) => (c.id === "de" ? { color: "#f00", width: 2 } : "none"),
      },
    });
    expect(svg).toContain('stroke="#f00" stroke-width="2"');
  });

  it("renders without countries for route-only share images", () => {
    const svg = renderStaticMapSvg({
      width: 400,
      height: 200,
      routes: [{ id: "r", stops: [[0, 0], [40, 20]] }],
    });
    expect(svg).toContain("<path");
    expect(svg).not.toContain("NaN");
  });

  it("renders selected marker rings and marker stroke overrides", () => {
    const svg = renderStaticMapSvg({
      width: 400,
      height: 200,
      theme: { markerSelected: "selected", halo: "halo" },
      markers: [{ id: "m", coordinates: [0, 0], size: 5, selected: true, stroke: "stroke", strokeWidth: 2 }],
    });
    expect(svg).toContain('r="9" fill="selected" stroke="none"');
    expect(svg).toContain('stroke="stroke" stroke-width="2" paint-order="stroke"');
  });

  it("omits visible marker labels when requested", () => {
    const svg = renderStaticMapSvg({
      width: 400,
      height: 200,
      showMarkerLabels: false,
      markers: [{ id: "m", coordinates: [0, 0], label: "Hidden" }],
    });
    expect(svg).not.toContain("<text");
  });
});

describe("escapeXml", () => {
  it("escapes markup-significant characters", () => {
    expect(escapeXml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&apos;&amp;&apos;&lt;/a&gt;",
    );
  });
});

describe("svgToDataUrl", () => {
  it("URI-encodes the SVG", () => {
    expect(svgToDataUrl("<svg/>")).toBe("data:image/svg+xml,%3Csvg%2F%3E");
  });
});
