#!/usr/bin/env bash
# Reminder stub for 07:00 UTC+8 devlog convention.
# Cron example (Asia/Taipei):
#   0 7 * * * TZ=Asia/Taipei /path/to/cash_flow_cfo/scripts/daily-devlog-reminder.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATE_HKT="$(TZ=Asia/Taipei date +%Y-%m-%d)"
OUT="$ROOT/docs/devlog/${DATE_HKT}-0700-hkt.md"
if [[ -f "$OUT" ]]; then
  echo "Devlog already exists: $OUT"
  exit 0
fi
cat > "$OUT" <<EOF
# ${DATE_HKT} 07:00 HKT — stub (agent write-up pending)

> Auto-generated stub. Replace with full agent write-up: summary, commits, architecture, tests, how-to, next PR.

## Summary

_TODO: agent session_

## Commits since last report

\`\`\`
$(cd "$ROOT" && git log --oneline -10 2>/dev/null || echo "n/a")
\`\`\`

## Next

See \`docs/AGENT_AUTOPILOT.md\` and \`docs/design/GOAL_REACH_PLANNER_DESIGN.md\` §10.
EOF
echo "Created stub: $OUT"
echo "Open Cursor and ask: Write today's full devlog and continue the next PR."