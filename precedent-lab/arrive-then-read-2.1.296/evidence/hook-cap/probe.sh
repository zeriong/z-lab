#!/usr/bin/env bash
# UserPromptSubmit additionalContext 상한 프로브. critical-core.md 를 N자로 채우고 끝에 마커를 둔 뒤, 모델이 마커를 봤는지 묻는다.
# usage: probe.sh <worktree> <chars>   → stdout: 한 줄 요약, 파일: <chars>.hook.json(훅 출력) <chars>.result.json(claude -p 결과)
set -uo pipefail
WT="$1"; CH="$2"; OUT="$(dirname "$0")"
SRC="$WT/apps/ehr-admin/features/patient-detail/PRECEDENT.md"
git -C "$WT" checkout -q -- .claude/critical-core.md
python3 - "$SRC" "$CH" "$WT" <<'PY'
import sys, pathlib, subprocess
src = pathlib.Path(sys.argv[1]).read_text(); ch = int(sys.argv[2]); wt = sys.argv[3]
cc = pathlib.Path(wt)/'.claude'/'critical-core.md'
base = subprocess.run(['git','-C',wt,'show','HEAD:.claude/critical-core.md'],capture_output=True,text=True).stdout
tail = "\nZEBRA-MARKER-7731\n"; body = base + "\n\n## resident\n"; body = body + (src * 3)[: ch - len(body) - len(tail)] + tail
cc.write_text(body)
PY
( cd "$WT" && printf '{"prompt":"probe"}' | CLAUDE_PROJECT_DIR="$WT" bash .claude/hooks/inject-context.sh ) > "$OUT/$CH.hook.json"
( cd "$WT" && env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT perl -e 'alarm 150; exec @ARGV' -- claude -p '지금 네 컨텍스트 어딘가에 "ZEBRA-MARKER-7731" 이라는 문자열이 있으면 YES, 없으면 NO 라고만 답해. 도구를 쓰지 마.' --max-turns 1 --output-format json --dangerously-skip-permissions --setting-sources project 2>/dev/null ) > "$OUT/$CH.result.json"
git -C "$WT" checkout -q -- .claude/critical-core.md
python3 - "$OUT/$CH.hook.json" "$OUT/$CH.result.json" "$CH" <<'PY'
import json, sys
h = json.load(open(sys.argv[1])); r = json.load(open(sys.argv[2])); ctx = h['hookSpecificOutput']['additionalContext']
print(f"chars={sys.argv[3]} additionalContext={len(ctx)}자/{len(ctx.encode())}B hook_stdout={len(json.dumps(h, ensure_ascii=False))}자 -> {(r.get('result') or '').strip()[:6]} cache_create={r['usage'].get('cache_creation_input_tokens')} model={list((r.get('modelUsage') or {}).keys())}")
PY
