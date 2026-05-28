#!/usr/bin/env bash
set -euo pipefail

APP="src-tauri/target/release/bundle/macos/Paste.app"
IDENTIFIER="com.wangk.clipboard-history"

if [[ ! -d "$APP" ]]; then
  echo "skip sign: $APP not found"
  exit 0
fi

echo "Re-signing $APP with stable identifier $IDENTIFIER"
codesign --force --deep --sign - --identifier "$IDENTIFIER" --options runtime "$APP"
codesign -dv --verbose=4 "$APP" 2>&1 | rg "Identifier=|TeamIdentifier=" || true
