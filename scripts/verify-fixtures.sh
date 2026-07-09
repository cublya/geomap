#!/usr/bin/env bash
# Packs the library and installs the tarball into the Vite and Next.js fixture
# apps, then builds each — verifying the published artifact (exports map, types,
# stylesheet subpath, server/client usage) rather than the source tree.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Reuse an existing build (CI builds once, up front); only build when run
# standalone without a dist. --ignore-scripts then skips prepack's rebuild.
[ -f dist/index.js ] || npm run build
TARBALL_NAME="$(npm pack --ignore-scripts --silent | tail -1)"
TARBALL="$ROOT/$TARBALL_NAME"
trap 'rm -f "$TARBALL"' EXIT
echo "packed $TARBALL_NAME"

for app in vite-app next-app; do
  echo "=== fixture: $app"
  cd "$ROOT/fixtures/$app"
  rm -rf node_modules dist .next package-lock.json next-env.d.ts
  npm install --no-audit --no-fund --loglevel=error
  # --no-save keeps the temp tarball path out of the committed manifests.
  npm install --no-save --no-audit --no-fund --loglevel=error "$TARBALL"
  npm run build
done

echo "=== fixtures OK"
