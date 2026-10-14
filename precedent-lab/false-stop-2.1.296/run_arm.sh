#!/usr/bin/env bash
# usage: run_arm.sh <C-xh|A-xh>  — 상태 인지형(제6조). 완료 판정은 result 이벤트의 is_error 로만 한다
# (plan-rail 발견 ①: 문자열 "is_error":true 는 도구 결과에도 있다).
set -uo pipefail
ARM="$1"
BASE=/Users/jeonjelyong/.cache/precedent-lab/false-stop
LAB=/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/precedent-lab/false-stop-2.1.296
done_ok() { python3 -c 'import json,sys
r=[json.loads(l) for l in open(sys.argv[1]) if "\"type\":\"result\"" in l]
sys.exit(0 if r and not r[-1].get("is_error") or (r and r[-1].get("subtype","").startswith("error_max")) else 1)' "$1" 2>/dev/null; }
for REP in 1 2 3; do
  for TASK in B1 B2 B3 B4 B5; do
    ID="${ARM}-${TASK}-r${REP}"
    if [ -f "$BASE/runs/$ID.jsonl" ] && done_ok "$BASE/runs/$ID.jsonl"; then echo "$ID skip (완료)"; continue; fi
    if [ -f "$BASE/runs/$ID.jsonl" ]; then
      TS=$(date +%s); mv "$BASE/runs/$ID.jsonl" "$BASE/runs/$ID.jsonl.failed.$TS"; mv "$BASE/diffs/$ID.diff" "$BASE/diffs/$ID.diff.failed.$TS" 2>/dev/null
      echo "$ID rerun $(date '+%F %T') — 이전 시도: result 없음 또는 실행 오류" >> "$BASE/logs/reruns.log"
    fi
    bash "$LAB/run_one.sh" "$ARM" "$TASK" "$REP"
  done
done
echo "arm $ARM finished"
