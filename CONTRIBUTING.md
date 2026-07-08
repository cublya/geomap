# Contributing

## Setup

```sh
npm install
```

Storybook and the `fixtures/` apps always resolve `@cublya/geomap` to `src/`
(see the alias in `.storybook/main.ts`), so changes to source are visible
immediately without a build step.

## Workflow

- `npm run dev`: watch build (`tsup --watch`).
- `npm run storybook`: dev server on `:6006`; add or update a story under
  `stories/` for any new component or prop surface.
- `npm run docs:dev`: VitePress dev server for the long-form documentation.
- `npm run build-site`: build Storybook and the documentation into the single
  GitHub Pages artifact (`storybook-static/`, with docs under `docs/`).
- Add or update a Vitest test under the matching `src/**/*.test.ts(x)` for any
  logic change.
- If you change the public API, update `docs/api-design.md`.

The [documentation index](docs/README.md) maps each change type to the guides
that must stay in sync. In particular, update `docs/api-reference.md` for public
surface changes and the architecture, data, theming, testing, or troubleshooting
guide when behavior in that area changes.

## Before opening a PR

Run the full check list; this mirrors `.github/workflows/ci.yml` exactly:

```sh
npm run lint
npm run typecheck
npm run test
npm run build
npx publint
npm run build-storybook
npm run docs:build
npm run test-storybook:ci
npm run test:e2e
bash scripts/verify-fixtures.sh
```

`npm run verify` bundles lint + typecheck + test + build + publint + pack
dry-run, but it does **not** cover Storybook, the interaction/accessibility
tests, or the Playwright screenshot suite; run those separately, since CI
does.

## Conventions

- TypeScript strict; prefer explicit types over `any`.
  `@typescript-eslint/consistent-type-imports` is enforced; use
  `import type` for type-only imports.
- ESM-only, `sideEffects: false`: avoid module-level side effects that would
  defeat tree-shaking.
- No CSS-in-JS, no Tailwind, no runtime style dependencies in `src/`: all
  presentation flows through SVG attributes, theme tokens (`src/theme.ts`),
  and the optional, namespaced `.geomap-*` stylesheet (`src/styles.css`).
- Visual presets stay generic: no brand colors, no product semantics.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, with an optional scope and
  `!` for breaking changes).

## Releasing

The package follows [Semantic Versioning](https://semver.org/) and is
currently pre-1.0 (`0.1.0`, unreleased); expect the API to still move. Add
entries under `## [Unreleased]` in `CHANGELOG.md` as you go; a maintainer cuts
a release by moving that section under a dated version heading and
publishing.
