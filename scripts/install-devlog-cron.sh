#!/usr/bin/env bash
# Install 07:00 Asia/Taipei daily devlog stub cron job.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$ROOT/scripts/daily-devlog-reminder.sh"
LOG="$ROOT/docs/devlog/cron.log"
MARKER="# cash-flow-cfo daily-devlog-reminder"
LINE="0 7 * * * TZ=Asia/Taipei $SCRIPT >> $LOG 2>&1 $MARKER"

chmod +x "$SCRIPT"

EXISTING="$(crontab -l 2>/dev/null || true)"
if echo "$EXISTING" | grep -qF "$MARKER"; then
  echo "Cron entry already installed:"
  echo "$EXISTING" | grep -F "$MARKER"
  exit 0
fi

{
  echo "$EXISTING"
  echo "$LINE"
} | crontab -

echo "Installed crontab entry:"
crontab -l | grep -F "$MARKER"
echo ""
echo "Runs daily at 07:00 HKT (Asia/Taipei). Log: $LOG"
echo "Verify cron is running: pgrep -x cron || sudo service cron start"