# Basemap coverage

`@cublya/geomap` ships no basemap (see [README § Install](../README.md#install)).
This tracks which `world-atlas` resolution covers the 193 UN member states and
the two non-member observer states (the Holy See and State of Palestine), so
picking one isn't guesswork.

## UN-member coverage by resolution

Verified against `world-atlas@2.0.2` by ISO 3166-1 `ccn3` numeric code. Note that
the `world-countries` dataset labels Vatican City as a UN member; the table below
uses the UN's formal classification instead.

| File | UN members | Observer states | Missing |
| --- | ---: | ---: | --- |
| `world-atlas/countries-10m.json` | 193 / 193 | 2 / 2 | none |
| `world-atlas/countries-50m.json` | 192 / 193 | 2 / 2 | Tuvalu |
| `world-atlas/countries-110m.json` | 165 / 193 | 1 / 2 | 28 members + Holy See — see below |

**Recommendation:** use `countries-10m.json` whenever coverage matters — country
pickers, "compare all UN members" claims, a choropleth a user can search or
filter by country. `110m`/`50m` are still fine for decorative or illustrative
maps (routes, markers, a zoomed regional view) where a missing microstate
polygon is inconsequential — they're also meaningfully smaller payloads.

### `countries-110m.json` — missing 28 members + 1 observer

Andorra, Antigua and Barbuda, Bahrain, Barbados, Cape Verde, Comoros, Dominica,
Grenada, Kiribati, Liechtenstein, Malta, Maldives, Marshall Islands, Mauritius,
Micronesia, Monaco, Nauru, Palau, Saint Kitts and Nevis, Saint Lucia, Saint
Vincent and the Grenadines, Samoa, San Marino, São Tomé and Príncipe,
Seychelles, Singapore, Tonga, Tuvalu.

Missing observer state: Holy See (Vatican City).

### `countries-50m.json` — missing 1

Tuvalu (`ccn3` `798`) — its nine atolls don't resolve at 50 m simplification.
`countries-10m.json` includes it.

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

`world-atlas` occasionally reshuffles its bundled resolutions (`countries-10m.json`
didn't exist before `world-atlas@2`). Re-run this check after bumping the
`world-atlas` dependency in any consuming app, or periodically here:

```sh
npm install world-atlas@latest world-countries --no-save
node -e "
const wc = require('world-countries');
const atlas = require('world-atlas/countries-10m.json'); // swap resolution to test
const ids = new Set(atlas.objects.countries.geometries.map((g) => g.id));
const members = wc.filter((c) => c.unMember && c.cca3 !== 'VAT');
const observers = wc.filter((c) => ['PSE', 'VAT'].includes(c.cca3));
console.log('Missing members:', members.filter((c) => !ids.has(c.ccn3)).map((c) => c.name.common));
console.log('Missing observers:', observers.filter((c) => !ids.has(c.ccn3)).map((c) => c.name.common));
"
```

Update the table above (and the date below) when the numbers change.

---

Last verified: **2026-07-08** against `world-atlas@2.0.2`.
