#!/bin/zsh
# Fin de migration V3 : lot 14 (réalisés hors du plan) + lot 15 (contract + lot 11) sur la base de .env.
# Usage: scripts/db-v3/run-contract.sh   (sauvegarde pg_dump avant, arrêt à la première erreur)
set -e
cd "$(dirname "$0")/../.."
URL=$(grep -E '^DIRECT_DATABASE_URL=' .env | cut -d= -f2- | tr -d '"' | sed 's/?connection_limit=[0-9]*//')
PG=/opt/homebrew/opt/libpq/bin
OUT=~/Documents/dev/running-tracker-backups/running-tracker-prod-pre-contract-$(date +%Y%m%d-%H%M%S).dump
"$PG/pg_dump" -Fc --no-owner --no-privileges -n public -f "$OUT" "$URL"
echo "backup: $OUT"
DATABASE_URL="$URL" npx tsx scripts/db-v3/lot14-intervals-from-legacy.ts --apply
"$PG/psql" -v ON_ERROR_STOP=1 -q "$URL" -f prisma/migrations/v3/lot15_contract.sql
"$PG/psql" "$URL" -Atc "select string_agg(table_name, ', ' order by table_name) from information_schema.tables where table_schema='public' and table_type='BASE TABLE';"
"$PG/psql" "$URL" -Atc "select (select count(*) from workouts) workouts, (select count(*) from planned_workouts) planned, (select count(*) from workout_sources) sources, (select count(*) from workout_streams) streams, (select count(*) from workout_intervals) intervals, (select count(*) from weather_observations) weather;"
echo "contract done"
