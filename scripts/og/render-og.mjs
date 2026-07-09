// Renders the branded Open Graph / Twitter card as a 1200x630 PNG.
//
// The design mirrors the shared Cublya card convention (see
// ../../cublya-agency/src/lib/og.tsx): a dark brand surface, a localized accent
// glow, the project wordmark top-left, the host top-right, a large headline, a
// subtitle, and pill chips along the bottom. Those cards are generated at build
// time by next/og; these static docs sites have no such pipeline, so we render
// the same layout once with headless Chromium and commit the PNG.
//
// Usage: node scripts/og/render-og.mjs
// Requires Playwright's Chromium (already a geomap devDependency).

import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");

// Brand tokens shared by both sibling sites (see docs/styles.css).
const INK = "#17251f";
const SURFACE = "#111c16";
const CREAM = "#f7f4ec";
const MUTED = "rgba(247, 244, 236, 0.62)";
const ACCENT = "#e86538";
const HAIRLINE = "rgba(247, 244, 236, 0.14)";

/** The concentric-ring "orbit" mark, recolored for a dark surface. */
function mark({ inner = ACCENT } = {}) {
  return `<svg width="52" height="52" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="20" fill="none" stroke="${CREAM}" stroke-width="4"/>
    <circle cx="32" cy="32" r="9.5" fill="none" stroke="${inner}" stroke-width="4"/>
  </svg>`;
}

function card({ name, host, headline, subtitle, chips }) {
  const chipHtml = chips
    .map(
      (c) =>
        `<span style="display:flex;align-items:center;padding:12px 24px;border-radius:999px;font-size:26px;color:#efe9dc;background:rgba(232,101,56,0.14);border:1px solid ${HAIRLINE}">${c}</span>`,
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:1200px;height:630px}
    .card{
      width:1200px;height:630px;padding:80px;
      display:flex;flex-direction:column;justify-content:space-between;
      background:
        radial-gradient(1100px 620px at 88% -10%, rgba(232,101,56,0.22), transparent 60%),
        radial-gradient(900px 700px at 6% 120%, rgba(23,37,31,0.9), transparent 55%),
        ${SURFACE};
      font-family:-apple-system,"Segoe UI",Inter,Roboto,Helvetica,Arial,sans-serif;
      color:${CREAM};
    }
    .top{display:flex;align-items:center;justify-content:space-between}
    .brand{display:flex;align-items:center;gap:16px}
    .brand .name{font-size:30px;font-weight:600;letter-spacing:7px;text-transform:uppercase;color:${CREAM}}
    .host{font-size:24px;color:rgba(247,244,236,0.45)}
    .mid{display:flex;flex-direction:column;gap:22px}
    .headline{font-size:82px;font-weight:700;line-height:1.03;letter-spacing:-1.5px;max-width:1000px}
    .headline em{color:${ACCENT};font-style:normal}
    .subtitle{font-size:33px;color:${MUTED};max-width:920px;line-height:1.3}
    .chips{display:flex;gap:16px;flex-wrap:wrap}
  </style></head><body>
    <div class="card">
      <div class="top">
        <div class="brand">${mark()}<span class="name">${name}</span></div>
        <div class="host">${host}</div>
      </div>
      <div class="mid">
        <div class="headline">${headline}</div>
        <div class="subtitle">${subtitle}</div>
      </div>
      <div class="chips">${chipHtml}</div>
    </div>
  </body></html>`;
}

const cards = [
  {
    out: resolve(repoRoot, "docs/assets/og-image.png"),
    html: card({
      name: "Geomap",
      host: "cublya.github.io/geomap",
      headline: `Maps &amp; globes,<br><em>ready to compose.</em>`,
      subtitle:
        "Composable React map primitives on d3-geo — choropleths, globes, routes and live objects.",
      chips: ["Choropleths", "Globes", "Great-circle routes", "Live objects"],
    }),
  },
  {
    out: resolve(repoRoot, "../world-atlas/docs/og-image.png"),
    html: card({
      name: "World Atlas",
      host: "cublya.github.io/world-atlas",
      headline: `World geography,<br><em>ready to draw.</em>`,
      subtitle:
        "Natural Earth vector data as quantized, versioned TopoJSON with documented boundary views.",
      chips: ["TopoJSON", "10m · 50m · 110m", "UN-style", "Public domain"],
    }),
  },
];

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 2,
});
for (const { out, html } of cards) {
  mkdirSync(dirname(out), { recursive: true });
  await page.setContent(html, { waitUntil: "networkidle" });
  const el = await page.$(".card");
  await el.screenshot({ path: out });
  console.log("wrote", out);
}
await browser.close();
