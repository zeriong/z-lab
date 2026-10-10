#!/usr/bin/env bash
# r2 — usage: setup_condition.sh <worktree> <A|B|C> <task_dir>
#   A graph-hook : graphify-out 있음 + 도착 훅 켜짐 (레포 실제 구성)
#   B graph-rule : graphify-out 있음 + 도착 훅 제거 (상주 규칙·포인터 주석만)
#   C grep-hook  : graphify-out 없음 + 도착 훅 켜짐 (탐색은 grep/ls 로만)
set -uo pipefail
WT="$1"; COND="$2"; TDIR="$3"
git -C "$WT" checkout -q -- . && git -C "$WT" clean -fdq -e graphify-out
if [ "$COND" = "B" ]; then
  python3 - "$WT/.claude/settings.json" <<'PY'
import json, sys
p = sys.argv[1]; d = json.load(open(p))
d["hooks"]["PostToolUse"] = [h for h in d["hooks"].get("PostToolUse", []) if h.get("matcher") != "Read|Edit|Write"]
json.dump(d, open(p, "w"), indent=2, ensure_ascii=False)
PY
fi
if [ "$COND" = "C" ]; then rm -rf "$WT/graphify-out"; fi
echo "setup $COND for $TDIR: PostToolUse=$(python3 -c 'import json,sys; print(len(json.load(open(sys.argv[1]))["hooks"]["PostToolUse"]))' "$WT/.claude/settings.json") graphify-out=$([ -f "$WT/graphify-out/graph.json" ] && echo yes || echo no)"
