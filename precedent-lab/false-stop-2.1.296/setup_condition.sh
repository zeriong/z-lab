#!/usr/bin/env bash
# usage: setup_condition.sh <C-xh|A-xh>  — clone 을 커밋 상태로 되돌리고 arm 설정을 다시 적용한다(멱등).
# gate-placement 의 C·A 설정 그대로(게이트 없음). 게이트 파일이 clone 에 있으면 중단.
set -uo pipefail
ARM="$1"
LAB=/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/precedent-lab/false-stop-2.1.296
MAIN=/path/to/REDACTED-repo
BASE=/Users/jeonjelyong/.cache/precedent-lab/false-stop
case "$ARM" in C-xh) C=R; INJ=precedent-inject.py ;; A-xh) C=I; INJ=precedent-inject-v3.py ;; *) echo "unknown arm $ARM"; exit 2 ;; esac
WT=/Users/jeonjelyong/.cache/precedent-lab/real-env-rail/wt-$C
git -C "$WT" checkout -q -- . && git -C "$WT" clean -fdq -e graphify-out
rsync -a --delete /Users/jeonjelyong/.cache/precedent-lab/plan-rail/graphify-snapshot/ "$WT/graphify-out/"
python3 - "$WT/.claude/settings.local.json" "$MAIN/.claude/settings.local.json" <<'PY'
import json, os, sys
dst, src = sys.argv[1:]
d = json.load(open(src)) if os.path.isfile(src) else {}
user = json.load(open(os.path.expanduser("~/.claude/settings.json")))
d["autoMemoryEnabled"] = False
d["enabledPlugins"] = {k: False for k in user.get("enabledPlugins", {})}
json.dump(d, open(dst, "w"), indent=2, ensure_ascii=False)
PY
cp "$LAB/hooks/$INJ" "$WT/.claude/hooks/precedent-inject.py"
python3 - "$WT/.claude/settings.json" <<'PY'
import json, sys
p = sys.argv[1]; d = json.load(open(p))
for h in d["hooks"]["PostToolUse"]:
    if h.get("matcher") == "Read|Edit|Write":
        h["matcher"] = "Read|Edit|Write|MultiEdit|Bash"
        h["hooks"] = [{"type": "command", "command": "python3 \"$CLAUDE_PROJECT_DIR/.claude/hooks/precedent-inject.py\""}]
json.dump(d, open(p, "w"), indent=2, ensure_ascii=False)
PY
LEAK=$(grep -rl 'precedent-write-gate' "$WT/.claude" "$WT/CLAUDE.md" 2>/dev/null | wc -l | tr -d ' ')
echo "setup $ARM (wt-$C): inject=$INJ gate_refs_in_clone=$LEAK post=$(python3 -c 'import json,sys; print([h["matcher"] for h in json.load(open(sys.argv[1]))["hooks"]["PostToolUse"]])' "$WT/.claude/settings.json") graph_nodes=$(python3 -c 'import json,sys; print(len(json.load(open(sys.argv[1]))["nodes"]))' "$WT/graphify-out/graph.json")"
[ "$LEAK" = 0 ] || { echo "gate file leaked into clone"; exit 3; }
