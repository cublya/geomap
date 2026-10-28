# Sources (all loaded 2026-10-18 unless noted)

- d3-geo projections: https://d3js.org/d3-geo/projection (fitExtent, rotate, invert)
- d3-geo cylindrical and pseudocylindrical projections: https://d3js.org/d3-geo/cylindrical
  (Mercator clips to about ±85°; Equal Earth is equal-area; Natural Earth is "neither conformal nor equal-area")
- d3-geo azimuthal projections: https://d3js.org/d3-geo/azimuthal
- d3-geo paths: https://d3js.org/d3-geo/path (path.area)
- d3-geo spherical math: https://d3js.org/d3-geo/math (geoArea in steradians)
- d3-scale quantize and threshold: https://d3js.org/d3-scale/quantize, https://d3js.org/d3-scale/threshold
- Equal Earth paper: Šavrič, Patterson, Jenny (2018), doi:10.1080/13658816.2018.1504949 (DOI handle resolves; publisher blocks scripted fetches)
- TopoJSON specification: https://github.com/topojson/topojson-specification
- topojson-client: https://github.com/topojson/topojson-client
- Natural Earth Admin 0 countries (de facto boundaries, POV variants): https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/
- WCAG 2.2 Use of Color: https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
- UN member states: https://www.un.org/en/about-us/member-states

## Measured in this pass

Area ratios in `docs/guides/choosing-a-projection.md` were computed with d3-geo
3.1 `geoArea` and `geoPath(projection).area` on `@cublya/world-atlas`
`countries-50m.json` (3.0.0-beta.2). Script: fit each projection to a 960×500
sphere, divide each country's projected area by DR Congo's.
