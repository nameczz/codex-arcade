#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GAME="${1:-both}"

case "$GAME" in
  brick|brick-breaker|codex-brick-breaker)
    PLUGINS=(codex-brick-breaker)
    ;;
  snake|codex-snake)
    PLUGINS=(codex-snake)
    ;;
  both)
    PLUGINS=(codex-brick-breaker codex-snake)
    ;;
  *)
    echo "Usage: $0 [brick|snake|both]" >&2
    exit 2
    ;;
esac

if ! command -v codex >/dev/null 2>&1; then
  echo "Error: codex CLI was not found in PATH." >&2
  exit 1
fi

if ! codex plugin marketplace list 2>/dev/null | grep -q 'codex-arcade'; then
  codex plugin marketplace add "$ROOT"
fi

for plugin in "${PLUGINS[@]}"; do
  codex plugin add "$plugin@codex-arcade"
done

echo "Installed: ${PLUGINS[*]}"
echo "Open a new Codex task and say: 打开打砖块 / 打开贪吃蛇"
