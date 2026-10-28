# SEO and content pass, October 2026

Scope: discoverability for developers. The package is a library with a small
static project site on GitHub Pages (`https://cublya.github.io/geomap/`: landing
page, Storybook, VitePress docs). No blog: a library of this size is better
served by guides inside the docs, next to the API they use, so none was added.

## Completed

- Two guides in the docs, linked from the sidebar, docs index, data and
  rendering guide, README, landing page and `llms.txt`:
  - `docs/guides/choosing-a-projection.md`: area ratios measured on real
    polygons (Mercator, Natural Earth, Equal Earth), which countries the 180°
    seam splits at a given rotation, custom projection factories, globe versus
    flat map.
  - `docs/guides/choropleth-map.md`: resolution and coverage, joining by ISO
    code and listing unmatched rows, Natural Earth conventions that change a
    fill (overseas departments, shared codes, features without ISO codes,
    boundary views), class breaks with d3-scale, WCAG 1.4.1, static export.
- VitePress metadata: product identity in one `brand` constant in
  `docs/.vitepress/config.ts`; descriptive title for the docs home; `og:type`
  `article` on guides; JSON-LD `SoftwareSourceCode` on the docs home and
  `TechArticle` on guides; `lastUpdated` for sitemap `<lastmod>`, with the Pages
  workflow checking out full history so dates are per page.
- README: plain first paragraph, links to docs and Storybook, a "When to use
  it" table by category, real badges (npm version, CI, licence), guide links.
  Removed an internal line about replacing maps in other apps.
- `package.json`: description, `author`, `homepage`, `bugs`, broader keywords.
- `llms.txt`: absolute links to the hosted docs (the relative links did not
  resolve from the npm tarball), guides added, and the file is now copied to
  the Pages site root by `build-pages`.
- Em dashes removed from the landing page OG alt text, the docs description
  and the Pages workflow comment.

## Proposed GitHub settings (not changed)

- Description: "React components for world maps and globes on d3-geo:
  choropleths, rotatable globes, routes and cameras, rendered to SVG or Canvas."
- Website: `https://cublya.github.io/geomap/` (already set).
- Topics: `react`, `map`, `world-map`, `globe`, `d3-geo`, `choropleth`,
  `topojson`, `geojson`, `natural-earth`, `cartography`, `data-visualization`,
  `typescript`, `svg`, `canvas`.

## Keyword clusters

See `.references/seo/keywords.md`. No volume tool was available: `No data`.

## Remaining issues and observations

- `robots.txt` is only read at a host root. `https://cublya.github.io/robots.txt`
  returns 404 (everything allowed), so `/geomap/robots.txt` and its `Sitemap:`
  lines are never read by crawlers. Submit
  `https://cublya.github.io/geomap/sitemap.xml` and
  `https://cublya.github.io/geomap/docs/sitemap.xml` in Search Console under a
  URL-prefix property for `https://cublya.github.io/geomap/`.
- The landing page (`docs/index.html`) is static HTML and repeats the product
  name ten times; it cannot read the VitePress constant.
- Landing page hero badge says `v0.0.1`; npm `latest` is `0.0.1-beta.5`.
- `prepareCountries` on `countries-50m.json` and `countries-10m.json` produces
  two entries with id `au` (Australia, and Ashmore and Cartier Islands, which
  shares numeric code `036`). Worth a check for duplicate React keys.
- Storybook pages have no per-story metadata; they are listed only as the
  Storybook root in the top-level sitemap. Fine for now.

## Product name occurrences outside the constant

Rename checklist if "Geomap" changes:
- `docs/.vitepress/config.ts`: `brand.name` (one place).
- `docs/index.html`: title, OG/Twitter tags, JSON-LD, header, alt text (10).
- `README.md`: logo alt text.
- `docs/public/brand/logo-*.svg`: wordmarks (3).
- `scripts/og/render-og.mjs`: OG image text; regenerate `docs/assets/og-image.png`.
- Package name `@cublya/geomap`, repository URL and the `geomap-*` CSS classes
  and `data-geomap-part` attributes are public API: renaming them is a breaking
  release, not a copy change.

## Checks

- Run: `tsc --noEmit` with a scratch file containing every guide snippet
  (passed; file removed). Runtime check of the lookup claims in the choropleth
  guide against `src/core/geodata.ts`. VitePress dev server compiled every
  changed page. All cited URLs loaded on 2026-10-18 (the Equal Earth DOI
  resolves; the publisher blocks scripted fetches).
- Not run: `npm run build-pages` / `docs:build` (renders `<head>`, JSON-LD and
  the sitemap with `<lastmod>`), full `npm run verify`.

## Next steps

1. After merge and deploy, inspect a built guide's `<head>` and
   `/geomap/docs/sitemap.xml` for `<lastmod>`.
2. Verify the Search Console property and submit both sitemaps.
3. Next guide candidates: great-circle flight routes on a map and a globe;
   static map images for social cards.
4. Check date for search data: 2027-01-18.
