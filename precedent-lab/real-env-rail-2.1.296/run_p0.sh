#!/usr/bin/env bash
# P0 상주 계측 — 같은 clone(wt-R)에서 로컬 설정만 바꿔 'ok' 만 답하게 한다. 상태 인지형.
set -uo pipefail
BASE=/Users/jeonjelyong/.cache/precedent-lab/real-env-rail
LAB=/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/precedent-lab/real-env-rail-2.1.296
for REP in 1 2; do
  for V in full nomem noplug lean proj; do
    ID="p-${V}-R-ok-r${REP}"
    if [ -f "$BASE/runs/$ID.jsonl" ] && grep -q '"type":"result"' "$BASE/runs/$ID.jsonl"; then echo "$ID skip"; continue; fi
    if [ "$V" = proj ]; then
      RUN_ID_PREFIX="p-${V}-" P0_VARIANT="" bash "$LAB/run_one.sh" R ok "$REP" --setting-sources project
    else
      RUN_ID_PREFIX="p-${V}-" P0_VARIANT="$([ "$V" = full ] && echo "" || echo "$V")" bash "$LAB/run_one.sh" R ok "$REP"
    fi
  done
done
