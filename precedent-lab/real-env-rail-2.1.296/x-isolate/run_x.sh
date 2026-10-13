#!/usr/bin/env bash
# x-isolate — R 설정 + --setting-sources project, T2·T3 × 3. 상태 인지형.
set -uo pipefail
BASE=/Users/jeonjelyong/.cache/precedent-lab/real-env-rail
LAB=/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/precedent-lab/real-env-rail-2.1.296
for REP in 1 2 3; do
  for TASK in T2 T3; do
    ID="x-R-${TASK}-r${REP}"
    if [ -f "$BASE/runs/$ID.jsonl" ] && grep -q '"type":"result"' "$BASE/runs/$ID.jsonl"; then echo "$ID skip"; continue; fi
    RUN_ID_PREFIX="x-" bash "$LAB/run_one.sh" R "$TASK" "$REP" --setting-sources project
  done
done
