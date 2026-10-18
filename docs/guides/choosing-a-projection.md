---
date: 2026-10-18
description: Mercator, Natural Earth, Equal Earth or an orthographic globe? Measured area distortion on real country polygons, the antimeridian seam, and how to pass a custom d3-geo projection.
---

# Choosing a projection for a world map

For a choropleth, where colour fills countries by value, use an equal-area
projection such as Equal Earth. For a general reference map, Natural Earth is a
good default. Use Mercator only when local shapes matter more than relative
size, or when the map has to line up with a web tile map. Use an orthographic
globe when the point is a sense of place, and accept that it shows at most half
the planet at once.

The rest of this guide shows why, with numbers measured on real country
polygons, then covers the seam at 180° longitude and custom projections.

## What each projection preserves

No flat map keeps area, shape and distance correct at once. Each projection
picks what to preserve:

| Projection | Preserves | Distorts | d3-geo factory |
| --- | --- | --- | --- |
| Mercator | Local angles and shapes (conformal) | Area, increasingly toward the poles; clipped near ±85° | [`geoMercator`](https://d3js.org/d3-geo/cylindrical#geoMercator) |
| Natural Earth | Nothing exactly; a compromise | Area and shape, moderately | [`geoNaturalEarth1`](https://d3js.org/d3-geo/cylindrical#geoNaturalEarth1) |
| Equal Earth | Area (equal-area) | Shape, especially near the edges | [`geoEqualEarth`](https://d3js.org/d3-geo/cylindrical#geoEqualEarth) |
| Orthographic | The look of a globe seen from space | Everything near the rim; hides the far side | [`geoOrthographic`](https://d3js.org/d3-geo/azimuthal#geoOrthographic) |

The d3-geo documentation describes Natural Earth as "neither conformal nor
equal-area, but appealing to the eye for small-scale maps of the whole world",
and Equal Earth as an equal-area projection by Šavrič, Patterson and Jenny,
published in 2018 ([doi:10.1080/13658816.2018.1504949](https://doi.org/10.1080/13658816.2018.1504949)).

## How much area distortion, measured

Greenland and the Democratic Republic of the Congo are close in true area. The
table below divides each country's area by DR Congo's: first on the sphere, then
as drawn by each projection.

| Country | True area ratio | Mercator | Natural Earth | Equal Earth |
| --- | ---: | ---: | ---: | ---: |
| Greenland | 0.92 | 15.00 | 1.96 | 0.92 |
| Russia | 7.22 | 35.13 | 11.14 | 7.22 |
| Canada | 4.23 | 21.57 | 6.45 | 4.23 |
| Norway | 0.16 | 1.46 | 0.29 | 0.16 |
| Brazil | 3.64 | 3.82 | 3.71 | 3.64 |
| Nigeria | 0.39 | 0.40 | 0.39 | 0.39 |

On Mercator, Greenland covers 15 times the screen area of DR Congo even though
it is slightly smaller. Natural Earth removes most of that error but
still draws Greenland about twice as large as it should be, and Russia about
half again too large. Equal Earth matches the true ratios to two decimal places. Countries
near the equator, such as Brazil and Nigeria, barely change in any of them.

How these numbers were produced: country polygons from
`@cublya/world-atlas/countries-50m.json`; true area from d3's
[`geoArea`](https://d3js.org/d3-geo/math#geoArea), which returns spherical
area in steradians; drawn area from
[`path.area`](https://d3js.org/d3-geo/path#path_area). Natural Earth and
Equal Earth were fitted to a 960 by 500 extent; Mercator, which cannot be
fitted to the whole sphere, was given a scale that maps 360° of longitude to
the same width. Ratios between countries do not depend on scale, so the
numbers hold at any map size. The script is
[`scripts/measure/projection-areas.mjs`](https://github.com/cublya/geomap/blob/main/scripts/measure/projection-areas.mjs).

### Why this matters for a choropleth

A reader's eye weighs a coloured region by its size. On Mercator, a dark shade
on Russia, Canada and Greenland dominates the picture whatever the data says
about the rest of the world. If the colour encodes a rate or a total per
country, an equal-area projection keeps the visual weight honest.

Natural Earth remains a reasonable choice for maps where colour marks a
category (visited, supported, selected) rather than a quantity, since nobody is
comparing magnitudes.

## Setting the projection in React

Flat maps take a named projection. The default is `naturalEarth1`:

```tsx
import { GeoMap, prepareCountries, type PreparedCountry } from "@cublya/geomap";
import world from "@cublya/world-atlas/countries-50m.json";
import type { Topology } from "topojson-specification";

const countries = prepareCountries(world as unknown as Topology, { exclude: ["AQ"] });

export function RateMap({ fill }: { fill: (c: PreparedCountry) => string | undefined }) {
  return (
    <div style={{ height: 480 }}>
      <GeoMap
        preset="light"
        projection="equalEarth"
        countries={{ data: countries, fill }}
        aria-label="Rate by country"
      />
    </div>
  );
}
```

The three named options are `naturalEarth1`, `mercator` and `equalEarth`. Each
is fitted to the whole sphere inside the map's view box, with an 8-unit inset
you can change through `projectionOptions.padding`.

Excluding Antarctica (`exclude: ["AQ"]`) is common on world choropleths: it has
no country data and, on equal-area and compromise projections, takes up a wide
band along the bottom.

## Moving the seam at 180° longitude

Every flat world map has to cut the globe somewhere. d3-geo cuts along the
meridian opposite the projection's centre, which by default is 180°. Anything
that crosses it is drawn in two pieces at opposite edges.

With the default rotation, these countries in the 50m file are split across the
left and right edges: Russia, Fiji, New Zealand, the United States, Kiribati and
Antarctica. Russia's Chukotka peninsula reaches past 180° into the Western
Hemisphere, so its tip appears beside Alaska on the far left.

Rotating the projection moves the cut. A rotation of `[-12, 0, 0]` centres the
map on 12° east and puts the cut at 168° west, inside the Bering Strait:

```tsx
<GeoMap
  projection="equalEarth"
  projectionOptions={{ rotate: [-12, 0, 0] }}
  countries={{ data: countries, fill }}
/>
```

Measured on the same file, that leaves only the United States (its Aleutian
Islands extend past 180°), Kiribati (it spans the line by design) and
Antarctica straddling the cut. Russia, Fiji and New Zealand render whole. A
rotation of `-10` is not enough; Russia's tip is still cut. The rotation follows
d3's [`projection.rotate`](https://d3js.org/d3-geo/projection#projection_rotate)
convention of `[lambda, phi, gamma]` in degrees.

Avoid large rotations on world maps. A rotation of `-150` centres the Pacific
but moves the cut to 30° west, which splits Greenland, South Georgia and,
through their overseas territories, France, the Netherlands and Portugal.
[`scripts/measure/antimeridian-seam.mjs`](https://github.com/cublya/geomap/blob/main/scripts/measure/antimeridian-seam.mjs)
lists the split countries for each rotation.

## Custom projections

When none of the named projections fits, pass a factory. It receives the view
box size and must return a fitted d3 `GeoProjection`. This example draws Europe
with a conic equal-area projection:

```tsx
import { geoConicEqualArea } from "d3-geo";
import type { Size } from "@cublya/geomap";

// Frame a longitude/latitude box rather than a set of countries.
const europeFrame = {
  type: "MultiPoint" as const,
  coordinates: [[-11, 35], [10, 35], [32, 35], [-11, 71], [32, 71]],
};

const europeProjection = ({ width, height }: Size) =>
  geoConicEqualArea()
    .parallels([43, 62])
    .rotate([-10, 0])
    .fitExtent([[8, 8], [width - 8, height - 8]], europeFrame);

<GeoMap projection={europeProjection} countries={{ data: countries, fill }} />;
```

Fitting to a box is deliberate. Fitting to the European countries' own
features looks simpler but fails on France: in the 50m and 10m files, the
France feature also contains French Guiana, Martinique, Réunion and Mayotte, so
the fitted frame stretches from South America to the Indian Ocean. The extra
point at 10° east on the bottom edge is there because a conic projection draws
parallels as arcs: the 35th parallel sags below its two corners in the middle,
and without that point the southern edge of the frame is cut off.

Three rules for factories:

1. Fit the projection yourself with
   [`fitExtent`](https://d3js.org/d3-geo/projection#projection_fitExtent) or
   `fitSize`. Named projections are fitted to the sphere for you; factories are
   not.
2. Return an invertible projection. Panning, cursor-centred zoom and `fitTo`
   convert screen points back to longitude and latitude through
   [`projection.invert`](https://d3js.org/d3-geo/projection#projection_invert).
   All projections built into d3-geo are invertible; some in third-party
   projection packages are not.
3. Keep the factory stable. Define it at module scope or memoize it, so the map
   does not rebuild its projection on every render.

`d3-geo` is a dependency of the package, but import it from your own code
only after adding it to your own `package.json` (`npm install d3-geo`). Strict
installers such as pnpm and Yarn Plug'n'Play do not let you import a package
you have not declared.

## When to use a globe instead

`GeoGlobe` always uses an orthographic projection clipped at 90°, which shows
exactly one hemisphere. That is the right tool when the map's job is
orientation: where a route goes, which side of the world a set of offices sits
on, or an ambient hero graphic. It is the wrong tool for comparing countries,
because anything near the rim is compressed to a sliver and half the data is
hidden.

If users need both, `GeoView` switches between a flat map and a globe with the
same props, and carries the geographic centre across the switch:

```tsx
<GeoView preset="light" defaultMode="map" countries={{ data: countries, fill }} />
```

## Checklist

- Colour encodes a quantity: `projection="equalEarth"`.
- Colour marks a category, or the map is decorative: the default
  `naturalEarth1` is fine.
- The map overlays or mimics a web tile map: `mercator`, and expect the poles
  to be clipped.
- Russia's tip appears on the wrong edge: `projectionOptions={{ rotate: [-12, 0, 0] }}`.
- A region, not the world: a factory with a regional projection, fitted to a
  longitude and latitude box.
- Orientation over comparison: `GeoGlobe`, or `GeoView` to offer both.

## Related

- [Rendering a choropleth map](./choropleth-map.md): joining data by ISO code,
  classing values and making the result readable without colour.
- [Data and rendering](../data-and-rendering.md): coordinate conventions,
  layers and performance.
- [API reference](../api-reference.md): every `GeoMap` and `GeoGlobe` prop.
