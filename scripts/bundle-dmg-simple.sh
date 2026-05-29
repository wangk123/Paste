#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/src-tauri/target/release/bundle/macos/Paste.app"
OUT_DIR="$ROOT/src-tauri/target/release/bundle/dmg"
VERSION="$(node -p "require('$ROOT/package.json').version")"
case "$(uname -m)" in
  arm64) ARCH=aarch64 ;;
  x86_64) ARCH=x86_64 ;;
  *) ARCH="$(uname -m)" ;;
esac
DMG="$OUT_DIR/Paste_${VERSION}_${ARCH}.dmg"

if [[ ! -d "$APP" ]]; then
  echo "error: $APP not found, run: npm run tauri build -- --bundles app"
  exit 1
fi

mkdir -p "$OUT_DIR"
rm -f "$OUT_DIR/Paste_${VERSION}_aarch64.dmg" "$OUT_DIR/Paste_${VERSION}_arm64.dmg" "$DMG"

hdiutil create \
  -volname "Paste" \
  -srcfolder "$APP" \
  -ov \
  -format UDZO \
  "$DMG"

echo "DMG: $DMG"
