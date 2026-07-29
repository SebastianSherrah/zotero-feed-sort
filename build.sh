#!/usr/bin/env bash

set -euo pipefail

project_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
version="$(node -p "require('${project_dir}/manifest.json').version")"
artifact="${project_dir}/dist/zotero-feed-sort-${version}.xpi"

node --check "${project_dir}/bootstrap.js"
node "${project_dir}/test.mjs"
node -e "JSON.parse(require('fs').readFileSync('${project_dir}/manifest.json', 'utf8'))"

mkdir -p "${project_dir}/dist"

(
  cd "${project_dir}"
  zip -FS -X -9 "${artifact}" \
    manifest.json \
    bootstrap.js \
    README.md \
    LICENSE \
    icons/icon-48.png \
    icons/icon-96.png
)

if command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "${artifact}"
else
  sha256sum "${artifact}"
fi
