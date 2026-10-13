#!/usr/bin/env bash
# x-isolate 2단계 — project 설정 소스 + 사용자 설정 하나씩(effort / language). 상태 인지형.
set -uo pipefail
BASE=/Users/jeonjelyong/.cache/precedent-lab/real-env-rail
LAB=/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/precedent-lab/real-env-rail-2.1.296
for REP in 1 2 3; do
  for TASK in T2 T3; do
    for V in xe xl; do
      ID="${V}-R-${TASK}-r${REP}"
      if [ -f "$BASE/runs/$ID.jsonl" ] && grep -q '"type":"result"' "$BASE/runs/$ID.jsonl"; then echo "$ID skip"; continue; fi
      if [ "$V" = xe ]; then
        RUN_ID_PREFIX="xe-" bash "$LAB/run_one.sh" R "$TASK" "$REP" --setting-sources project --effort xhigh
      else
        RUN_ID_PREFIX="xl-" bash "$LAB/run_one.sh" R "$TASK" "$REP" --setting-sources project --settings '{"language":"korean"}'
      fi
    done
  done
done
