#!/usr/bin/env bash
# usage: setup_condition.sh <C-xh|H-xh|A-xh>  — clone 을 커밋 상태로 되돌리고 arm 설정을 다시 적용한다(멱등).
# plan-rail 과 다른 점: 게이트 파일을 clone 에 두지 않는다(오염 수정). H 의 게이트는 레포 밖 BASE/gate 에서 --settings 로 등록(run_one.sh).
set -uo pipefail
ARM="$1"
LAB=/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/precedent-lab/gate-placement-2.1.296
MAIN=/Users/jeonjelyong/WorkSpace/CloudHospital/synolink-ehr
BASE=/Users/jeonjelyong/.cache/precedent-lab/gate-placement
case "$ARM" in C-xh) C=R; INJ=precedent-inject.py ;; H-xh) C=L; INJ=precedent-inject.py ;; A-xh) C=I; INJ=precedent-inject-v3.py ;; *) echo "unknown arm $ARM"; exit 2 ;; esac
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
mkdir -p "$BASE/gate"
cp "$LAB/hooks/precedent-write-gate.py" "$BASE/gate/precedent-write-gate.py"
printf '{"hooks":{"PreToolUse":[{"matcher":"Edit|Write|MultiEdit|Bash","hooks":[{"type":"command","command":"python3 %s/gate/precedent-write-gate.py"}]}]}}\n' "$BASE" > "$BASE/gate/settings.json"
LEAK=$(grep -rl 'precedent-write-gate' "$WT/.claude" "$WT/CLAUDE.md" 2>/dev/null | wc -l | tr -d ' ')
echo "setup $ARM (wt-$C): inject=$INJ gate_refs_in_clone=$LEAK post=$(python3 -c 'import json,sys; print([h["matcher"] for h in json.load(open(sys.argv[1]))["hooks"]["PostToolUse"]])' "$WT/.claude/settings.json") graph_nodes=$(python3 -c 'import json,sys; print(len(json.load(open(sys.argv[1]))["nodes"]))' "$WT/graphify-out/graph.json")"
[ "$LEAK" = 0 ] || { echo "gate file leaked into clone"; exit 3; }
