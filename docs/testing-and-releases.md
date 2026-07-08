# Testing and releases

## Local setup

```sh
npm install
```

`@cublya/world-atlas` is a local development dependency (`../world-atlas`). The
sibling repository must exist for a clean install. Installed consumers do not
inherit this requirement because basemap ownership belongs to them.

## Test layers

The project deliberately tests at several boundaries:

| Layer | Command | Covers |
| --- | --- | --- |
| Lint | `npm run lint` | TypeScript/React conventions and hooks |
| Type check | `npm run typecheck` | Public types, source, stories, and examples |
| Unit/component | `npm run test` | Geometry, cameras, preparation, rendering behavior |
| Package build | `npm run build` | ESM JavaScript, declarations, stylesheet output |
| Package metadata | `npx publint` | Export map and published-package correctness |
| Hosted site build | `npm run build-site` | Storybook and VitePress compile as one Pages artifact |
| Story interactions/a11y | `npm run test-storybook:ci` | Browser interactions and axe assertions |
| Visual regression | `npm run test:e2e` | Playwright screenshot comparisons |
| Consumer fixtures | `bash scripts/verify-fixtures.sh` | Packed package installs in Vite and Next.js |

`npm run verify` runs lint, type checking, unit tests, build, publint, and an npm
pack dry-run. It does not run Storybook, browser, or fixture checks.

## Writing tests

Put core tests beside their implementation as `src/core/*.test.ts`. Put React
surface and layer behavior beside React modules as `src/react/*.test.tsx`.

Prefer assertions on observable behavior:

- camera snapshots and subscriber notifications;
- generated path, attributes, and semantic hooks;
- pointer/keyboard outcomes;
- reduced-motion outcomes;
- static SVG contents and escaping;
- ISO lookup and geometry preparation results.

Avoid testing private helper structure. Public behavior should remain testable
if an implementation moves between modules.

Use fake timers or deterministic animation primitives for camera/live behavior.
Always stop animations or unmount components so animation frames do not leak
between tests.

## Storybook and visual tests

Stories are executable examples, but they are not the only documentation. Add a
story when a change needs visual inspection, browser interaction, an accessibility
assertion, or a stable regression screenshot.

To update visual baselines intentionally:

1. Build the hosted site with `npm run build-site`.
2. Run Playwright with snapshot updates using the same browser/platform as the
   committed baseline.
3. Inspect every changed image; do not accept a directory-wide update without
   explaining the visual change.
4. Commit deleted and replacement snapshots together.

Pixel snapshots are platform-sensitive. A font, browser, antialiasing, or OS
change can produce noise. CI is the source of truth for the configured platform.

## Fixture verification

The fixture script builds and packs the actual npm artifact, installs it into
minimal Vite and Next.js applications, and builds those applications. This finds
problems that source aliases hide, including:

- missing files in the npm package;
- incorrect `exports` or declaration paths;
- accidental CommonJS assumptions;
- SSR/import-time browser API access;
- CSS subpath export failures.

Run it after changing package metadata, build configuration, exports, styles, or
framework-sensitive code.

## Documentation checks

For a public change, search all documentation and examples for the old name or
default:

```sh
rg "OldProp|oldDefault" README.md CONTRIBUTING.md docs examples stories
```

Code examples in `examples/` are typechecked. Markdown snippets are not, so copy
critical patterns into a typechecked example or test when practical. Verify local
Markdown links after adding, moving, or renaming a document.

## Release procedure

The package follows Semantic Versioning. Before 1.0, clearly call out breaking
changes even when they use a minor version bump.

1. Confirm all user-visible changes are under `## [Unreleased]` in
   `CHANGELOG.md`.
2. Update documentation, examples, migrations, and screenshots.
3. Run the full CI-equivalent command set from
   [Contributing](https://github.com/cublya/geomap/blob/main/CONTRIBUTING.md).
4. Review the `npm pack --dry-run` file list. The package should include `dist`,
   README, and license, with working root and stylesheet exports.
5. Move Unreleased entries under a dated version heading and set the matching
   version in `package.json` and lockfile.
6. Build from a clean checkout and publish with the configured public access.
7. Tag the exact published commit and verify a fresh consumer install.

Do not publish from an unreviewed dirty tree: local generated output or unrelated
changes can make the artifact impossible to reproduce.

## Generated ISO data

Run `node scripts/generate-iso.mjs` only when updating the identity source. Review
the generated diff and run ISO, geodata, basemap coverage, and full unit tests.
Generated identity changes can affect lookups and exclusions without changing
geometry, so they require a changelog note when observable to consumers.
