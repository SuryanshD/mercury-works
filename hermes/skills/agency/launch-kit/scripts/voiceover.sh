#!/usr/bin/env bash
# voiceover.sh <script-text> <out.mp3> — ElevenLabs TTS for the brand's radio ad.
# Reads ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID from env (~/.hermes/.env).
# Fire-safe: on any error prints "VOICEOVER_UNAVAILABLE" and exits 0 so the pipeline degrades, never fails.
set -uo pipefail

TEXT="${1:?usage: voiceover.sh <script-text> <out.mp3>}"
OUT="${2:?usage: voiceover.sh <script-text> <out.mp3>}"
: "${ELEVENLABS_API_KEY:?set ELEVENLABS_API_KEY in ~/.hermes/.env}"
: "${ELEVENLABS_VOICE_ID:?set ELEVENLABS_VOICE_ID in ~/.hermes/.env}"

BODY=$(python3 -c 'import json,sys; print(json.dumps({"text":sys.argv[1],"model_id":"eleven_flash_v2_5","voice_settings":{"stability":0.5,"similarity_boost":0.75,"style":0.3}}))' "$TEXT")
CODE=$(curl -s -m 45 -o "$OUT" -w '%{http_code}' \
  -X POST "https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" -H "Content-Type: application/json" -H "Accept: audio/mpeg" \
  -d "$BODY")

if [ "$CODE" = "200" ] && [ -s "$OUT" ]; then
  echo "VOICEOVER $OUT ($(wc -c < "$OUT" | tr -d ' ') bytes)"
else
  echo "VOICEOVER_UNAVAILABLE (http $CODE)"
  head -c 200 "$OUT" 2>/dev/null; echo
  rm -f "$OUT"
  exit 0
fi
