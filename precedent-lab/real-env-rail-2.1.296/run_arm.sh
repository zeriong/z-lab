#!/usr/bin/env bash
# usage: run_arm.sh <R|I|L|G>  — 상태 인지형(제6조): result 이벤트가 있는 런은 건너뛴다.
set -uo pipefail
ARM="$1"
BASE=/Users/jeonjelyong/.cache/precedent-lab/real-env-rail
LAB=/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/precedent-lab/real-env-rail-2.1.296
for REP in 1 2 3; do
  for TASK in T1 T2 T3 T4 T5 R1 R2; do
    ID="${ARM}-${TASK}-r${REP}"
    if [ -f "$BASE/runs/$ID.jsonl" ] && grep -q '"type":"result"' "$BASE/runs/$ID.jsonl"; then
      echo "$ID skip (완료)"; continue
    fi
    if [ -f "$BASE/runs/$ID.jsonl" ]; then
      # 실행 오류 런은 같은 조건으로 1회만 다시 돈다 — 원 파일은 .failed 로 남긴다
      mv "$BASE/runs/$ID.jsonl" "$BASE/runs/$ID.jsonl.failed.$(date +%s)"
      echo "$ID rerun (이전 시도에 result 없음)" >> "$BASE/logs/reruns.log"
    fi
    bash "$LAB/run_one.sh" "$ARM" "$TASK" "$REP"
  done
done
echo "arm $ARM finished"
