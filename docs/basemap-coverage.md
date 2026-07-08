# Basemap coverage

`@cublya/geomap` ships no basemap (see
[README § Install](https://github.com/cublya/geo#install)).
This tracks which `@cublya/world-atlas` resolution covers the 193 UN member
states and the two non-member observer states (the Holy See and State of
Palestine), so picking one isn't guesswork.

The default `countries-*.json` files use the atlas package's UN-style boundary
view:

- Crimea resolves to Ukraine.
- Kosovo resolves to Serbia.
- Northern Cyprus and the Cyprus U.N. Buffer Zone resolve to Cyprus.
- Somaliland resolves to Somalia.
- Western Sahara remains a distinct territory (`EH` / `ESH` / `732`).

Use `countries-independent-*.json` when you want Natural Earth's independent
map-unit view with Kosovo, Northern Cyprus, Somaliland, and similar source units
kept separate.

## UN-member coverage by resolution

Verified against `@cublya/world-atlas@3.0.0-beta.0` by ISO 3166-1 `ccn3` numeric code.
Note that the `world-countries` dataset labels Vatican City as a UN member; the
table below uses the UN's formal classification instead.

| File | UN members | Observer states | Missing |
| --- | ---: | ---: | --- |
| `@cublya/world-atlas/countries-10m.json` | 193 / 193 | 2 / 2 | none |
| `@cublya/world-atlas/countries-50m.json` | 193 / 193 | 2 / 2 | none |
| `@cublya/world-atlas/countries-110m.json` | 165 / 193 | 1 / 2 | 28 members + Holy See (see below) |

**Recommendation:** use `countries-10m.json` when border detail matters and
`countries-50m.json` when complete country coverage matters but payload size is
more important. `110m` is still fine for decorative or illustrative maps
(routes, markers, a zoomed regional view) where missing microstate polygons are
inconsequential.

### `countries-110m.json`: missing 28 members + 1 observer

Andorra, Antigua and Barbuda, Bahrain, Barbados, Cape Verde, Comoros, Dominica,
Grenada, Kiribati, Liechtenstein, Malta, Maldives, Marshall Islands, Mauritius,
Micronesia, Monaco, Nauru, Palau, Saint Kitts and Nevis, Saint Lucia, Saint
Vincent and the Grenadines, Samoa, San Marino, São Tomé and Príncipe,
Seychelles, Singapore, Tonga, Tuvalu.

Missing observer state: Holy See (Vatican City).

## Maintained alternative

[geoBoundaries](https://www.geoboundaries.org/) `gbOpen` ADM0 covers all UN
member states and is maintained by William & Mary geoLab. It provides
simplified GeoJSON and TopoJSON through a versioned API with yearly archives;
the GeoJSON can be passed directly to `prepareCountries()`.

Its license is **CC BY 4.0**, so attribution is required. For a public-domain
source with no attribution requirement, use current Natural Earth Admin 0 data
and generate the required GeoJSON or TopoJSON during the application's data
build.

## Re-verifying

Re-run this check after bumping the `@cublya/world-atlas` dependency in any
consuming app, or periodically here:

```sh
npm install @cublya/world-atlas@latest world-countries --no-save
node -e "
const wc = require('world-countries');
const atlas = require('@cublya/world-atlas/countries-10m.json'); // swap resolution to test
const ids = new Set(atlas.objects.countries.geometries.map((g) => g.id));
const members = wc.filter((c) => c.unMember && c.cca3 !== 'VAT');
const observers = wc.filter((c) => ['PSE', 'VAT'].includes(c.cca3));
console.log('Missing members:', members.filter((c) => !ids.has(c.ccn3)).map((c) => c.name.common));
console.log('Missing observers:', observers.filter((c) => !ids.has(c.ccn3)).map((c) => c.name.common));
console.log('Boundary view:', atlas.objects.countries.geometries[0].properties.boundaryView);
"
```

Update the table above (and the date below) when the numbers change.

---

Last verified: **2026-07-08** against `@cublya/world-atlas@3.0.0-beta.0`.
