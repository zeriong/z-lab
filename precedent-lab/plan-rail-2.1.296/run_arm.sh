#!/usr/bin/env bash
# usage: run_arm.sh <P-hi|P-xh|G-hi|G-xh>  — 상태 인지형(제6조): result 가 있고 is_error 가 아닌 런은 건너뛴다.
set -uo pipefail
ARM="$1"
BASE=/Users/jeonjelyong/.cache/precedent-lab/plan-rail
LAB=/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/precedent-lab/plan-rail-2.1.296
for REP in 1 2 3; do
  for TASK in T1 T2 T3 T4 T5; do
    ID="${ARM}-${TASK}-r${REP}"
    if [ -f "$BASE/runs/$ID.jsonl" ] && grep -q '"type":"result"' "$BASE/runs/$ID.jsonl" && ! grep -q '"is_error":true' "$BASE/runs/$ID.jsonl"; then
      echo "$ID skip (완료)"; continue
    fi
    if [ -f "$BASE/runs/$ID.jsonl" ]; then
      TS=$(date +%s); mv "$BASE/runs/$ID.jsonl" "$BASE/runs/$ID.jsonl.failed.$TS"; mv "$BASE/diffs/$ID.diff" "$BASE/diffs/$ID.diff.failed.$TS" 2>/dev/null
      echo "$ID rerun $(date '+%F %T') — 이전 시도: result 없음 또는 is_error" >> "$BASE/logs/reruns.log"
    fi
    bash "$LAB/run_one.sh" "$ARM" "$TASK" "$REP"
  done
done
echo "arm $ARM finished"
