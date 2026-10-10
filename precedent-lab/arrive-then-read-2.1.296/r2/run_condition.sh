#!/usr/bin/env bash
# usage: run_condition.sh <A|B|C>  — 해당 조건의 워크트리에서 T1..T5 × r1,r2 를 순서대로 돈다
set -uo pipefail
COND="$1"; WT="/tmp/precedent-lab/r2/wt-$COND"
for REP in 1 2; do for TASK in T1 T2 T3 T4 T5; do
  [ -s "/tmp/precedent-lab/r2/runs/${COND}-${TASK}-r${REP}.jsonl" ] && { echo "skip ${COND}-${TASK}-r${REP}"; continue; }
  bash /tmp/precedent-lab/r2/run_one.sh "$WT" "$COND" "$TASK" "$REP"
done; done
echo "condition $COND complete"
