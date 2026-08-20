#!/bin/sh
set -e

# Optionally fire one run immediately on container start (handy for a first
# smoke test / demo), then hand off to cron for the scheduled runs.
if [ "$RUN_ON_START" = "true" ]; then
  echo "[entrypoint] RUN_ON_START=true — running one digest now"
  node src/index.js || echo "[entrypoint] start run failed (continuing to cron)"
fi

echo "[entrypoint] starting cron (schedule: /etc/crontabs/root)"
exec crond -f -l 8
