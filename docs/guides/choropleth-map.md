---
date: 2026-10-18
description: Build a world choropleth in React. Join values by ISO code, find the records that silently fail to match, class values with d3-scale, and make the map readable without colour.
---

# Rendering a choropleth map in React

A choropleth colours each country by a value. Drawing one takes a few lines.
Getting one right takes a few decisions that the first version usually skips:
which code joins your data to the shapes, which records failed to join, how
values become colours, and how a reader without perfect colour vision gets the
same information.

This guide builds a world map of a per-country rate, step by step, with
`@cublya/geomap` and `@cublya/world-atlas`. The geometry facts in it were
checked against `@cublya/world-atlas` 3.0.0-beta.2.

## 1. Pick the resolution before anything else

The resolution decides which countries can show data at all, so it comes
first.

The 110m file is small, but Natural Earth leaves microstates out of it. Of the
193 UN member states, 28 are missing, including Singapore, Bahrain, Malta, the
Maldives, Mauritius, Monaco and most Pacific and Caribbean island states. The
Holy See is missing too. On a 110m map, a value for Singapore has nowhere to
go and disappears without an error.

Use 50m for choropleths unless you have a reason not to: it covers all 193
members and both observer states. Use 10m for large or zoomable maps. The
[basemap coverage notes](../basemap-coverage.md) list the numbers and how to
re-check them.

```ts
import { prepareCountries } from "@cublya/geomap";
import world from "@cublya/world-atlas/countries-50m.json";
import type { Topology } from "topojson-specification";

export const countries = prepareCountries(world as unknown as Topology, { exclude: ["AQ"] });
```

Call `prepareCountries` once, at module scope or behind `useMemo`. It converts
the TopoJSON, resolves every feature to ISO 3166-1 codes and computes centroids
and bounds, which is work you do not want on every render.

## 2. Join on one code, and check what did not join

Every prepared country has `alpha2`, `alpha3` and `numeric` codes when it maps
to an ISO 3166-1 entry, plus a canonical `name`. `countries.get()` accepts any
of them, and common Natural Earth spellings such as "Dem. Rep. Congo":

```ts
countries.get("CD") === countries.get("COD");     // true
countries.get("180") === countries.get("Dem. Rep. Congo"); // true
```

That forgiveness is for lookups at the edges of your app. For the join itself,
pick the code your data source uses, index the records once, and compare
against the same field:

```ts
type Row = { iso3: string; rate: number | null };

const byIso3 = new Map(rows.map((r) => [r.iso3.toUpperCase(), r]));

export const rateOf = (alpha3: string | null) =>
  alpha3 ? byIso3.get(alpha3)?.rate ?? null : null;
```

Then list both kinds of mismatch. Run this in development or in a data test,
not on every render:

```ts
const mapAlpha3 = new Set(countries.countries.map((c) => c.alpha3).filter(Boolean));

const unmatchedRows = rows.filter((r) => !mapAlpha3.has(r.iso3.toUpperCase()));
const countriesWithoutRow = countries.countries.filter(
  (c) => c.alpha3 && !byIso3.has(c.alpha3),
);

console.table(unmatchedRows);
console.table(countriesWithoutRow.map((c) => ({ id: c.id, name: c.name })));
```

`unmatchedRows` catches the silent failures: a value for a microstate on the
wrong resolution, a regional aggregate such as "EUU" or "WLD" in a World
Bank-style export, or a code your source invented. `countriesWithoutRow` shows
the countries that will render as "no data", so you can confirm each one is
genuinely missing rather than misspelled.

### Shapes that are not one country

Natural Earth's Admin 0 countries layer, which the atlas is built from, follows
a few conventions that change what a fill means:

- **Overseas departments belong to the parent.** In the 50m and 10m files, the
  France feature also contains French Guiana, Martinique, Réunion and Mayotte.
  A value for France colours all of them, even if your data has separate rows
  for `GUF` or `REU`. Those rows will show up in `unmatchedRows`.
- **Small dependencies may share a code.** In the 50m and 10m files, Ashmore
  and Cartier Islands carries Australia's numeric code `036`, so it takes
  Australia's colour.
- **Some areas have no ISO code.** The 50m file includes Siachen Glacier and
  the Indian Ocean Territories without an ISO identity; the 10m file adds
  more, such as Bir Tawil and the Spratly Islands.
  They render, and your join will never colour them.
- **Disputed areas follow a policy.** The default `countries-*.json` files
  assign Crimea to Ukraine and dissolve Kosovo into Serbia; the
  `countries-independent-*.json` files keep Kosovo and similar map units
  separate. See [boundary views](https://github.com/cublya/world-atlas#boundary-views)
  and choose deliberately. If your product needs a different editorial
  decision, change the geometry in `prepareCountries`'s `patchFeatures` hook,
  not in the renderer.

Natural Earth documents its approach as de facto: it draws "who actually
controls the situation on the ground" and offers separate point-of-view
datasets for other positions
([Admin 0 countries](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/)).

## 3. Turn values into a few colours

A choropleth reads best with a small number of classes rather than a
continuous gradient: readers can match a class in the map to the legend, and
neighbouring countries are easier to compare. ColorBrewer's sequential schemes
come in three to nine classes; five is a sensible starting point.

There are three common ways to choose class breaks. [d3-scale](https://d3js.org/d3-scale)
has one scale for each:

| Method | d3 scale | Breaks at | Use when |
| --- | --- | --- | --- |
| Equal intervals | [`scaleQuantize`](https://d3js.org/d3-scale/quantize) | Uniform slices of the min to max range | Values are spread fairly evenly, or the range has natural meaning such as 0 to 100 % |
| Quantiles | [`scaleQuantile`](https://d3js.org/d3-scale/quantile) | Equal numbers of countries per class | Data is skewed and you care about rank more than magnitude |
| Chosen thresholds | [`scaleThreshold`](https://d3js.org/d3-scale/threshold) | Values you pick | Breaks have meaning: policy targets, round numbers, published bands |

Skewed data, such as population or GDP, is where the choice shows. With equal
intervals, a few very large countries take the top class and nearly everyone
else lands in the bottom one. Quantiles spread the colours but can put very
different values in the same class. Chosen thresholds take more thought and
are the easiest to explain in a legend.

`@cublya/geomap` does not ship a scale or a palette; your app owns both. With
d3-scale and a ColorBrewer palette from
[d3-scale-chromatic](https://d3js.org/d3-scale-chromatic) (most of its schemes
come from Cynthia Brewer's [ColorBrewer](https://colorbrewer2.org/)):

```ts
import { scaleThreshold } from "d3-scale";
import { schemeBlues } from "d3-scale-chromatic";

export const breaks = [5, 10, 20, 40];        // four breaks, five classes
const colour = scaleThreshold<number, string>()
  .domain(breaks)
  .range(schemeBlues[5]);

export const fillFor = (alpha3: string | null) => {
  const rate = rateOf(alpha3);
  return rate == null ? undefined : colour(rate);
};
```

Two details matter here:

- **Return `undefined` for missing data, never a colour.** The country layer
  paints `undefined` in a muted "no data" tone that is distinct from the
  palette. A real zero should get the lowest class colour, so readers can tell
  "zero" from "unknown".
- **Keep the callback cheap.** `fill` runs for every country and runs again
  when the projection or theme changes. Index the data first, as above, and
  avoid sorting or scanning arrays inside it.

If you would rather not add d3-scale, a threshold scale is a few lines of
plain code:

```ts
export const PALETTE = ["#eff3ff", "#bdd7e7", "#6baed6", "#3182bd", "#08519c"];
const classOf = (v: number) => breaks.filter((b) => v >= b).length;
const colour = (v: number) => PALETTE[classOf(v)];
```

## 4. Render it

```tsx
import * as React from "react";
import { GeoMap, GeoTooltip, type CountryHover } from "@cublya/geomap";
import { countries } from "./countries";
import { breaks, fillFor, PALETTE, rateOf } from "./data";
import { Legend } from "./legend"; // your design system's legend

export function RateMap() {
  const [hover, setHover] = React.useState<CountryHover | null>(null);

  return (
    <figure style={{ margin: 0 }}>
      <div style={{ height: 480 }}>
        <GeoMap
          preset="light"
          projection="equalEarth"
          projectionOptions={{ rotate: [-12, 0, 0] }}
          countries={{
            data: countries,
            fill: (c) => fillFor(c.alpha3),
            onHover: setHover,
          }}
          wheelZoom={false}
          aria-label="Rate by country, 2025. Darker blue is higher."
        />
      </div>
      <GeoTooltip point={hover?.point} preset="light">
        {hover && `${hover.country.name}: ${rateOf(hover.country.alpha3) ?? "No data"}`}
      </GeoTooltip>
      <figcaption>
        <Legend breaks={breaks} palette={PALETTE} />
      </figcaption>
    </figure>
  );
}
```

The choices in that snippet, briefly:

- `projection="equalEarth"` keeps country areas proportional, so large
  high-latitude countries do not dominate the picture. The
  [projection guide](./choosing-a-projection.md) shows the measured
  difference.
- `rotate: [-12, 0, 0]` moves the 180° seam into the Bering Strait so Russia,
  Fiji and New Zealand are drawn whole.
- `wheelZoom={false}` stops the map from capturing the page's scroll wheel
  when it is embedded in an article.
- The `aria-label` says what the map shows, not that it is a map.

The package ships no legend. A legend is a short list of colour swatches with
their ranges, and it belongs in your design system. Include a swatch for "no
data" that matches the muted tone.

## 5. Make it readable without colour

[WCAG 2.2 success criterion 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
asks that "color is not used as the only visual means of conveying
information". A colour-only choropleth fails it for anyone who cannot tell two
adjacent shades apart. Three measures cover most cases:

1. **Choose a sequential palette that varies in lightness**, not only in hue.
   Single-hue ColorBrewer schemes such as Blues do; rainbow palettes do not.
2. **Add a second channel where it matters.** The country layer can overlay a
   `hatch` or `dots` pattern. Use it for a category on top of the value, such
   as "estimate" or "above target":

   ```ts
   countries={{
     data: countries,
     fill: (c) => fillFor(c.alpha3),
     pattern: (c) => (isEstimate(c.alpha3) ? "hatch" : undefined),
   }}
   ```

3. **Give the numbers a home outside the map.** Hover tooltips do not reach
   keyboard or screen reader users. Put the values in a sortable table next to
   the map, or show the selected country's value in a panel driven by
   `onSelect`. The map stays keyboard-focusable either way.

## 6. Export it as an image

For a share card or a report, `renderStaticMapSvg` renders the same geometry
and fills to an SVG string without React or a DOM, and `svgToPngBlob` turns
that into a PNG in the browser:

```ts
import { renderStaticMapSvg, svgToPngBlob } from "@cublya/geomap";

const svg = renderStaticMapSvg({
  width: 1200,
  height: 630,
  projection: "equalEarth",
  countries: { data: countries, fill: (c) => fillFor(c.alpha3) },
  preset: "light",
});
const png = await svgToPngBlob(svg, { width: 1200, height: 630 });
```

Use concrete colours in the palette for exports. CSS variables without a
fallback depend on a surrounding document and will not resolve in a standalone
file.

## Checklist

- [ ] 50m or 10m geometry, unless every country in the data is in the 110m file.
- [ ] One join key, and an empty `unmatchedRows` (or every entry explained).
- [ ] Overseas territories and shared codes checked against the data's rows.
- [ ] A boundary view chosen on purpose.
- [ ] A handful of classes (five is a good default), with breaks you can explain.
- [ ] `undefined` for missing data; real zeros get a colour.
- [ ] Equal-area projection.
- [ ] Legend with a "no data" swatch.
- [ ] Values available outside the colour: table, panel or pattern.

## Related

- [Choosing a projection](./choosing-a-projection.md)
- [Data and rendering](../data-and-rendering.md): coordinate conventions,
  layers, static rendering and performance.
- [Theming and accessibility](../theming-and-accessibility.md): presets,
  patterns, keyboard support and tooltips.
