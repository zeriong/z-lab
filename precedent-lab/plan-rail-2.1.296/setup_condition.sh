#!/usr/bin/env bash
# usage: setup_condition.sh <P-hi|P-xh|G-hi|G-xh>  — clone 을 커밋 상태로 되돌리고 arm 설정을 다시 적용한다(멱등).
set -uo pipefail
ARM="$1"
LAB=/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/precedent-lab/plan-rail-2.1.296
MAIN=/path/to/REDACTED-repo
case "$ARM" in P-hi) C=R ;; P-xh) C=I ;; G-hi) C=L ;; G-xh) C=G ;; *) echo "unknown arm $ARM"; exit 2 ;; esac
WT=/Users/jeonjelyong/.cache/precedent-lab/real-env-rail/wt-$C
git -C "$WT" checkout -q -- . && git -C "$WT" clean -fdq -e graphify-out -e .claude/hooks/precedent-inject.py -e .claude/hooks/precedent-write-gate.py
# 그래프는 런마다 메인 체크아웃 사본(10-06 빌드)으로 다시 깐다 — 에이전트의 `graphify update .` 가 앞선 런의 변경을 색인해 남기는 것을 막는다(real-env-rail 사후 발견)
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
cp "$LAB/hooks/precedent-inject.py" "$WT/.claude/hooks/precedent-inject.py"
cp "$LAB/hooks/precedent-write-gate.py" "$WT/.claude/hooks/precedent-write-gate.py"
python3 - "$WT/.claude/settings.json" "$ARM" <<'PY'
import json, sys
p, arm = sys.argv[1:]; d = json.load(open(p))
for h in d["hooks"]["PostToolUse"]:
    if h.get("matcher") == "Read|Edit|Write":
        h["matcher"] = "Read|Edit|Write|MultiEdit|Bash"
        h["hooks"] = [{"type": "command", "command": "python3 \"$CLAUDE_PROJECT_DIR/.claude/hooks/precedent-inject.py\""}]
if arm.startswith("G-"):
    d["hooks"]["PreToolUse"].append({"matcher": "Edit|Write|MultiEdit|Bash", "hooks": [
        {"type": "command", "command": "python3 \"$CLAUDE_PROJECT_DIR/.claude/hooks/precedent-write-gate.py\""}]})
json.dump(d, open(p, "w"), indent=2, ensure_ascii=False)
PY
echo "setup $ARM (wt-$C): pre=$(python3 -c 'import json,sys; print([h["matcher"] for h in json.load(open(sys.argv[1]))["hooks"]["PreToolUse"]])' "$WT/.claude/settings.json") post=$(python3 -c 'import json,sys; print([h["matcher"] for h in json.load(open(sys.argv[1]))["hooks"]["PostToolUse"]])' "$WT/.claude/settings.json") graph_nodes=$(python3 -c 'import json,sys; print(len(json.load(open(sys.argv[1]))["nodes"]))' "$WT/graphify-out/graph.json")"
