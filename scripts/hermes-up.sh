#!/usr/bin/env bash
# Build (if needed) and (re)start the Hermes container from the custom image that has the Langfuse
# SDK baked in. Durable: langfuse lives in the IMAGE, so observability survives a Mac restart AND a
# container re-create (a one-off `docker exec ... pip install` is lost on `docker rm`).
#
# Usage:  bash scripts/hermes-up.sh
# Assumes: ~/.hermes/ holds config.yaml + .env (see the reference setup). docker on PATH
#          (Rancher Desktop: ~/.rd/bin).
set -uo pipefail
IMG="mercury-hermes"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="${HERMES_PROJECT_DIR:-$DIR}"

command -v docker >/dev/null 2>&1 || { echo "docker not on PATH (Rancher: export PATH=\$HOME/.rd/bin:\$PATH)"; exit 1; }
[ -f "$HOME/.hermes/.env" ] || { echo "missing ~/.hermes/.env — set up Hermes config first"; exit 1; }

echo "→ building $IMG (langfuse baked in)…"
docker build -t "$IMG" "$DIR" || { echo "build failed"; exit 1; }

echo "→ (re)starting the hermes container…"
docker rm -f hermes >/dev/null 2>&1 || true
docker run -d --name hermes --restart unless-stopped \
  -v "$HOME/.hermes:/opt/data" \
  -v "$PROJECT:/workspace/project" \
  -p 127.0.0.1:8642:8642 \
  --env-file "$HOME/.hermes/.env" \
  "$IMG" gateway run >/dev/null

sleep 3
if docker exec hermes /opt/hermes/.venv/bin/python -c "import langfuse, sys; sys.stdout.write(langfuse.__version__)" 2>/dev/null; then
  echo "  ✅ hermes up — langfuse present (observability will trace)"
else
  echo "  ⚠️ hermes up but langfuse import failed — check the build"
fi
