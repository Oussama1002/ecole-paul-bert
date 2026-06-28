#!/usr/bin/env bash
# Run on production server from repo root:
#   bash scripts/prod-data-check.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="$ROOT/backend-api"

if [[ ! -f "$API/.env" ]]; then
  echo "ERROR: $API/.env not found"
  exit 1
fi

echo "=== App path ==="
echo "$ROOT"
echo

echo "=== Git (last 5 commits) ==="
git -C "$ROOT" log -5 --oneline 2>/dev/null || echo "(not a git repo)"
echo

echo "=== DB config (.env) ==="
grep -E '^APP_ENV=|^APP_DEBUG=|^APP_URL=|^DB_' "$API/.env" || true
echo

echo "=== Laravel DB connection ==="
cd "$API"
php artisan tinker --execute="
echo 'driver: ' . config('database.default') . PHP_EOL;
echo 'host: ' . config('database.connections.mysql.host') . PHP_EOL;
echo 'database: ' . config('database.connections.mysql.database') . PHP_EOL;
"
echo

echo "=== Row counts ==="
php artisan tinker --execute="
\$tables = ['school_years','students','teachers','levels','classes','subjects','users','enrollments'];
foreach (\$tables as \$t) {
  if (Schema::hasTable(\$t)) {
    echo \$t . ': ' . DB::table(\$t)->count() . PHP_EOL;
  } else {
    echo \$t . ': TABLE MISSING' . PHP_EOL;
  }
}
if (Schema::hasTable('class_school_year')) {
  echo 'class_school_year: ' . DB::table('class_school_year')->count() . PHP_EOL;
} else {
  echo 'class_school_year: TABLE MISSING' . PHP_EOL;
}
"
echo

echo "=== School years sample ==="
php artisan tinker --execute="
DB::table('school_years')->orderByDesc('start_date')->limit(5)->get(['id','name','is_current','status'])->each(function(\$y) {
  echo json_encode(\$y) . PHP_EOL;
});
"
echo

echo "=== Recent migrations (2026_05+) ==="
php artisan migrate:status | grep -E '2026_05|2026_06|Pending' || true
echo

echo "=== Laravel log (last errors) ==="
LOG="$API/storage/logs/laravel.log"
if [[ -f "$LOG" ]]; then
  tail -n 30 "$LOG" | grep -iE 'error|exception|SQLSTATE' || echo "(no recent errors in tail)"
else
  echo "(no laravel.log)"
fi
