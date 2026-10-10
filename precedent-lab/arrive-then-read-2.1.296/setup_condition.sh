#!/usr/bin/env bash
# usage: setup_condition.sh <worktree> <A|B|C> <task_dir>
set -uo pipefail
WT="$1"; COND="$2"; TDIR="$3"
git -C "$WT" checkout -q -- . && git -C "$WT" clean -fdq
if [ "$COND" != "A" ]; then
  python3 - "$WT/.claude/settings.json" <<'PY'
import json, sys
p = sys.argv[1]; d = json.load(open(p))
d["hooks"]["PostToolUse"] = [h for h in d["hooks"].get("PostToolUse", []) if h.get("matcher") != "Read|Edit|Write"]
json.dump(d, open(p, "w"), indent=2, ensure_ascii=False)
PY
fi
if [ "$COND" = "C" ]; then
  # C': 상주 문서(루트 CLAUDE.md)에 해당 PRECEDENT.md 전문을 쌓는다. 훅 주입은 약 15KB 상한에서 통째로 버려져 쓸 수 없다(2026-10-10 실측).
  { printf '\n\n## PRECEDENT (resident copy of %s/PRECEDENT.md)\n\n' "$TDIR"; cat "$WT/$TDIR/PRECEDENT.md"; } >> "$WT/CLAUDE.md"
fi
echo "setup $COND for $TDIR: settings hooks PostToolUse=$(python3 -c 'import json,sys; print(len(json.load(open(sys.argv[1]))["hooks"]["PostToolUse"]))' "$WT/.claude/settings.json") CLAUDE.md=$(wc -c < "$WT/CLAUDE.md")B"
