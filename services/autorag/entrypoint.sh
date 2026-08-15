#!/bin/sh
set -eu
bun /app/sync-corpus.ts
./node_modules/.bin/autorag refresh --config "${AUTORAG_CONFIG:-/app/autorag.config.json}" --method parsed,bm25
exec bun /app/server.ts
