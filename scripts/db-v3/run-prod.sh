#!/bin/bash
# Lance la migration V3 (expand + migrate) sur la base de .env (URL directe commentée) et journalise dans /tmp/v3-prod.log
set -uo pipefail
DIR="$(cd "$(dirname "$0")/../.." && pwd)"
URL="$(grep '^# DATABASE_URL=' "$DIR/.env" | head -1 | sed -e 's/^# DATABASE_URL="//' -e 's/"$//')"
if [ -z "$URL" ]; then echo "URL introuvable dans .env"; exit 1; fi
"$DIR/scripts/db-v3/run.sh" "$URL" 2>&1 | grep -v NOTICE | tee /tmp/v3-prod.log
