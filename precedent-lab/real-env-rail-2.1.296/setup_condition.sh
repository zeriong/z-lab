#!/usr/bin/env bash
# usage: setup_condition.sh <R|I|L|G>  — clone 을 커밋 상태로 되돌리고 arm 설정을 다시 적용한다(멱등).
set -uo pipefail
ARM="$1"
BASE=/Users/jeonjelyong/.cache/precedent-lab/real-env-rail
LAB=/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/precedent-lab/real-env-rail-2.1.296
WT="$BASE/wt-$ARM"
MAIN=/Users/jeonjelyong/WorkSpace/CloudHospital/synolink-ehr
git -C "$WT" checkout -q -- . && git -C "$WT" clean -fdq -e graphify-out -e .claude/hooks/precedent-inject.py

# 로컬 설정: R·I 는 메인 체크아웃과 같은 파일, L·G 는 memory·사용자 플러그인 끔
python3 - "$WT/.claude/settings.local.json" "$MAIN/.claude/settings.local.json" "$ARM" <<'PY'
import json, os, sys
dst, src, arm = sys.argv[1:]
d = json.load(open(src)) if os.path.isfile(src) else {}
user = json.load(open(os.path.expanduser("~/.claude/settings.json")))
# P0 변형(run_p0.sh 전용): nomem · noplug · lean — 과제 런에서는 비어 있다
variant = os.environ.get("P0_VARIANT", "")
if arm in ("L", "G") or variant in ("nomem", "lean"):
    d["autoMemoryEnabled"] = False
if arm in ("L", "G") or variant in ("noplug", "lean"):
    d["enabledPlugins"] = {k: False for k in user.get("enabledPlugins", {})}
json.dump(d, open(dst, "w"), indent=2, ensure_ascii=False)
PY

if [ "$ARM" != "R" ]; then
  cp "$LAB/hooks/precedent-inject.py" "$WT/.claude/hooks/precedent-inject.py"
  python3 - "$WT/.claude/settings.json" <<'PY'
import json, sys
p = sys.argv[1]; d = json.load(open(p))
for h in d["hooks"]["PostToolUse"]:
    if h.get("matcher") == "Read|Edit|Write":
        h["matcher"] = "Read|Edit|Write|MultiEdit|Bash"
        h["hooks"] = [{"type": "command", "command": "python3 \"$CLAUDE_PROJECT_DIR/.claude/hooks/precedent-inject.py\""}]
json.dump(d, open(p, "w"), indent=2, ensure_ascii=False)
PY
fi

if [ "$ARM" = "G" ]; then
  python3 - "$WT/CLAUDE.md" <<'PY'
import sys
p = sys.argv[1]; s = open(p, encoding="utf-8").read()
old = "- `explain`/`path` 를 `query` 보다 먼저. 심볼·문자열을 이미 알면 grep/Read 가 빠르다."
new = "- 편집·점검 대상 파일을 아직 모르면 grep 전에 `graphify explain`/`query` 로 후보 경로를 먼저 찾는다. 경로를 안 뒤의 값·시그니처 확인은 grep/Read."
assert old in s, "G: 교체 대상 줄 없음"
open(p, "w", encoding="utf-8").write(s.replace(old, new))
PY
fi

echo "setup $ARM: post=$(python3 -c 'import json,sys; print([h["matcher"] for h in json.load(open(sys.argv[1]))["hooks"]["PostToolUse"]])' "$WT/.claude/settings.json") local=$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print("mem=", d.get("autoMemoryEnabled", "default"), "plugins_off=", sum(1 for v in d.get("enabledPlugins", {}).values() if v is False))' "$WT/.claude/settings.local.json") graph_nodes=$(python3 -c 'import json,sys; print(len(json.load(open(sys.argv[1]))["nodes"]))' "$WT/graphify-out/graph.json") claude_md_routing=$(grep -c '대상 파일을 아직 모르면' "$WT/CLAUDE.md")"
