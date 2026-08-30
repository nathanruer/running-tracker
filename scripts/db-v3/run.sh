#!/bin/bash
# Applique les lots V3 (expand + migrate) puis la conversion lot 6 et les contrôles de parité.
# Usage: scripts/db-v3/run.sh "<DATABASE_URL>"
set -euo pipefail
URL="$1"
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
DIR="$(cd "$(dirname "$0")/../.." && pwd)"
for lot in lot01_timestamps lot02_metrics lot03_sources lot04_streams lot05_weather lot06_planned lot07_profiles lot08_athlete_states lot09_conversations lot10_plans lot13_intervals_family; do
  echo "== $lot"
  psql -v ON_ERROR_STOP=1 -q "$URL" -f "$DIR/prisma/migrations/v3/$lot.sql"
done
echo "== lot06 conversion"
DATABASE_URL="$URL" node "$DIR/scripts/db-v3/convert-planned.mjs"
echo "== parity"
psql -v ON_ERROR_STOP=1 "$URL" -f "$DIR/scripts/db-v3/parity.sql"
