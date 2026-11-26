#!/usr/bin/env bash
# Minify the Lovelace card into the canonical URL path HA already loads.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/custom_components/simple_schedule/www/simple-schedule-card.src.js"
OUT="$ROOT/custom_components/simple_schedule/www/simple-schedule-card.js"
if [[ ! -f "$SRC" ]]; then
  echo "missing source: $SRC" >&2
  exit 1
fi
# Pin terser so CI and local builds match.
npx --yes terser@5.37.0 "$SRC" -c -m -o "$OUT"
# Preserve a readable banner (terser strips comments by default with -c).
VERSION="$(python3 -c "import json; print(json.load(open('$ROOT/custom_components/simple_schedule/manifest.json'))['version'])")"
TMP="$(mktemp)"
{
  echo "/* simple-schedule-card v${VERSION} (minified) */"
  cat "$OUT"
} > "$TMP"
mv "$TMP" "$OUT"
echo "built $OUT ($(wc -c < "$OUT") bytes)"
