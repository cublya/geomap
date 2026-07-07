import { geoGraticule10, geoPath } from "d3-geo";
import type { CountrySet, GeoMarker, GeoRoute, PreparedCountry } from "../types";
import { toLonLat } from "../core/coords";
import { routeLineString } from "../core/routes";
import {
  createFlatProjection,
  type FlatProjectionOptions,
  type ProjectionInput,
} from "../core/projections";
import { resolveTheme, type GeoPresetName, type GeoTheme } from "../theme";

export interface StaticMapOptions {
  width: number;
  height: number;
  countries?: {
    data: CountrySet;
    fill?: (country: PreparedCountry) => string | undefined;
    stroke?: string;
  };
  markers?: GeoMarker[];
  routes?: GeoRoute[];
  projection?: ProjectionInput;
  projectionOptions?: FlatProjectionOptions;
  graticule?: boolean;
  /** Visual preset, same as the components. Default "none" (unstyled). */
  preset?: GeoPresetName;
  /**
   * Partial token overrides over the preset. Preset values are
   * `var(--geo-*, fallback)` — standalone SVGs resolve to the fallback,
   * so exports render correctly outside any page context.
   */
  theme?: Partial<GeoTheme>;
  /** Painted behind everything; use a concrete color for share images. */
  background?: string;
}

export function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/**
 * Render a flat map to a standalone SVG string — no React, no DOM. The same
 * geometry pipeline as `<GeoMap>`, so exports match on-screen maps ('s
 * WYSIWYG share-image guarantee). Pass concrete colors in `theme`/`background`;
 * `var(--token)` cannot resolve outside a page.
 */
export function renderStaticMapSvg(options: StaticMapOptions): string {
  const {
    width,
    height,
    countries,
    markers = [],
    routes = [],
    projection: projectionInput = "naturalEarth1",
    projectionOptions,
    graticule = false,
    background,
  } = options;
  const theme = resolveTheme(options.preset, options.theme);
  const attr = (name: string, value: string | undefined) =>
    value === undefined ? "" : ` ${name}="${escapeXml(value)}"`;
  const projection = createFlatProjection(projectionInput, { width, height }, projectionOptions);
  const path = geoPath(projection);

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  );
  if (background) {
    parts.push(`<rect width="${width}" height="${height}" fill="${escapeXml(background)}"/>`);
  }
  if (graticule) {
    const d = path(geoGraticule10());
    if (d) {
      parts.push(`<path d="${d}" fill="none"${attr("stroke", theme.graticule)} stroke-width="0.5"/>`);
    }
  }
  if (countries) {
    const stroke = attr("stroke", countries.stroke ?? theme.landStroke);
    for (const country of countries.data.countries) {
      const d = path(country.feature);
      if (!d) continue;
      const fill = countries.fill
        ? (countries.fill(country) ?? theme.landMuted)
        : theme.land;
      parts.push(`<path d="${d}"${attr("fill", fill)}${stroke} stroke-width="0.5"/>`);
    }
  }
  for (const route of routes) {
    if (route.stops.length < 2) continue;
    const d = path(routeLineString(route.stops));
    if (!d) continue;
    const dash = route.dashed ? ' stroke-dasharray="4 4"' : "";
    parts.push(
      `<path d="${d}" fill="none"${attr("stroke", route.color ?? theme.route)}` +
        ` stroke-width="${route.width ?? 1.4}" stroke-opacity="${route.opacity ?? 0.9}"` +
        `${dash} stroke-linecap="round"/>`,
    );
  }
  for (const marker of markers) {
    const p = projection(toLonLat(marker.coordinates));
    if (!p || !p.every(Number.isFinite)) continue;
    const r = marker.size ?? 3;
    parts.push(
      `<circle cx="${p[0]}" cy="${p[1]}" r="${r}"${attr("fill", marker.color ?? theme.marker)}/>`,
    );
    if (marker.label) {
      parts.push(
        `<text x="${p[0] + r + 3}" y="${p[1] + r}" font-size="9"` +
          ` font-family="system-ui, sans-serif"${attr("fill", theme.markerLabel)}>` +
          `${escapeXml(marker.label)}</text>`,
      );
    }
  }
  parts.push("</svg>");
  return parts.join("");
}

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export interface PngOptions {
  width: number;
  height: number;
  /** Device-pixel multiplier for crisp exports. Default 2. */
  scale?: number;
  type?: string;
  quality?: number;
}

/** Rasterize an SVG string via Image + canvas. Browser only. */
export function svgToPngBlob(svg: string, options: PngOptions): Promise<Blob> {
  const { width, height, scale = 2, type = "image/png", quality } = options;
  if (typeof document === "undefined" || typeof Image === "undefined") {
    return Promise.reject(new Error("svgToPngBlob requires a browser environment"));
  }
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not acquire a 2d canvas context"));
        return;
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("canvas.toBlob returned null"))),
        type,
        quality,
      );
    };
    image.onerror = () => reject(new Error("Failed to load the SVG image"));
    image.src = svgToDataUrl(svg);
  });
}
