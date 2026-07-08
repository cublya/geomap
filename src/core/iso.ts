import { ISO_3166_1, type IsoRow } from "./iso-data";

export interface IsoCountry {
  alpha2: string;
  alpha3: string;
  numeric: string;
  name: string;
}

function rowToCountry([alpha2, alpha3, numeric, name]: IsoRow): IsoCountry {
  return { alpha2, alpha3, numeric, name };
}

/** Accent-, case- and punctuation-insensitive name key. */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.'’]/g, "")
    .replace(/[-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Natural Earth / @cublya/world-atlas display names that differ from the ISO English short
 * name, covering the 110m and 50m atlases. Keys are {@link normalizeName} outputs.
 */
const NAME_OVERRIDES: Record<string, string> = {
  "bolivia": "BO",
  "bosnia and herz": "BA",
  "br indian ocean ter": "IO",
  "british virgin is": "VG",
  "brunei": "BN",
  "cabo verde": "CV",
  "cape verde": "CV",
  "cayman is": "KY",
  "central african rep": "CF",
  "cook is": "CK",
  "czech rep": "CZ",
  "czechia": "CZ",
  "dem rep congo": "CD",
  "dem rep korea": "KP",
  "dominican rep": "DO",
  "eq guinea": "GQ",
  "eswatini": "SZ",
  "faeroe is": "FO",
  "falkland is": "FK",
  "fr polynesia": "PF",
  "fr s antarctic lands": "TF",
  "heard i and mcdonald is": "HM",
  "iran": "IR",
  "korea": "KR",
  "kyrgyz republic": "KG",
  "lao pdr": "LA",
  "laos": "LA",
  "macedonia": "MK",
  "marshall is": "MH",
  "micronesia": "FM",
  "moldova": "MD",
  "n mariana is": "MP",
  "netherlands antilles": "AN",
  "north korea": "KP",
  "north macedonia": "MK",
  "pitcairn is": "PN",
  "russia": "RU",
  "s geo and the is": "GS",
  "s sudan": "SS",
  "saint helena": "SH",
  "sao tome and principe": "ST",
  "solomon is": "SB",
  "south korea": "KR",
  "st barthelemy": "BL",
  "st kitts and nevis": "KN",
  "st lucia": "LC",
  "st martin": "MF",
  "st pierre and miquelon": "PM",
  "st vin and gren": "VC",
  "swaziland": "SZ",
  "syria": "SY",
  "tanzania": "TZ",
  "the bahamas": "BS",
  "the gambia": "GM",
  "turkey": "TR",
  "turks and caicos is": "TC",
  "u s virgin is": "VI",
  "united kingdom": "GB",
  "united states": "US",
  "us virgin is": "VI",
  "vatican": "VA",
  "venezuela": "VE",
  "vietnam": "VN",
  "w sahara": "EH",
  "wallis and futuna is": "WF",
};

const byAlpha2 = new Map<string, IsoCountry>();
const byAlpha3 = new Map<string, IsoCountry>();
const byNumeric = new Map<string, IsoCountry>();
const byName = new Map<string, IsoCountry>();

for (const row of ISO_3166_1) {
  const country = rowToCountry(row);
  byAlpha2.set(country.alpha2, country);
  byAlpha3.set(country.alpha3, country);
  byNumeric.set(country.numeric, country);
  byName.set(normalizeName(country.name), country);
}
for (const [name, alpha2] of Object.entries(NAME_OVERRIDES)) {
  const country = byAlpha2.get(alpha2);
  if (country && !byName.has(name)) byName.set(name, country);
}

/**
 * Look up a country by ISO alpha-2, alpha-3 or numeric code (any case; numbers
 * accepted and zero-padded).
 */
export function lookupIso(code: string | number): IsoCountry | undefined {
  const raw = String(code).trim();
  if (/^\d+$/.test(raw)) return byNumeric.get(raw.padStart(3, "0"));
  const upper = raw.toUpperCase();
  if (upper.length === 2) return byAlpha2.get(upper);
  if (upper.length === 3) return byAlpha3.get(upper);
  return undefined;
}

/**
 * Resolve a display name (ISO English short name or a Natural Earth atlas name)
 * to an ISO country.
 */
export function resolveCountryName(name: string): IsoCountry | undefined {
  return byName.get(normalizeName(name));
}
