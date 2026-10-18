# Keyword and intent notes (2026-10-18)

No search-volume tool was available in this pass: volumes are `No data`. Clusters
are built from package metadata of alternatives, upstream issue titles and the
product's real capabilities. Re-check with Search Console once the docs property
is verified.

## Clusters

| Cluster | Example queries (hypothesised) | Intent | Page |
| --- | --- | --- | --- |
| React world map component | react world map, react choropleth map, react svg map | Choose a library | README, landing, getting started |
| React globe | react globe component, react rotating globe svg, orthographic globe react | Choose a library | Landing, getting started |
| Choropleth how-to | choropleth map react d3, color countries by value react, iso code join map | Learn and build | `docs/guides/choropleth-map.md` |
| Projection choice | d3 projection for world map, mercator vs equal earth, which map projection choropleth | Learn | `docs/guides/choosing-a-projection.md` |
| Great-circle routes | d3 great circle arc, flight route map react | Build | data-and-rendering (routes) |
| Static map image | render map to png react, svg map export | Build | data-and-rendering (static) |

## Real user language (problem space)

From upstream TopoJSON world data issues (github.com/topojson/world-atlas/issues):
"Missing IDs for several features" (#23), "French Guiana is labelled as France" (#33),
"Same country id for Australia and Ashmore and Cartier Is" (#41),
"Russia boundaries causing strange map artifacts" (#8), "Country borders are shown
not according to United Nation regulations" (#42). These map to the choropleth
guide's identity and editorial-geometry sections and the projection guide's
antimeridian section.
