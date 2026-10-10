#!/usr/bin/env bash
# 시제품(2026-10-10 실험 D arm): PostToolUse(Bash) 에서 cat/sed/head/tail/awk/grep/less 로 읽은
# .ts/.tsx/.css/.mjs/.sh 경로를 뽑아, 같은 세션의 precedent-context.sh 에 Read 이벤트로 넘긴다.
# 중복 억제 마커는 precedent-context.sh 가 (session, agent, 키) 단위로 관리하므로 그대로 공유된다.
set -uo pipefail
trap 'exit 0' EXIT
input=""
IFS= read -r -d '' input || true
case "$input" in *'"Bash"'*) ;; *) exit 0 ;; esac
case "$input" in *'.ts'* | *'.tsx'* | *'.css'* | *'.mjs'* | *'.sh'*) ;; *) exit 0 ;; esac
dir="${CLAUDE_PROJECT_DIR:-$PWD}"
# 파이썬 본문을 heredoc 으로 넘기므로 stdin 을 쓸 수 없다 — 훅 입력은 환경변수로 전달한다
HOOK_INPUT="$input" python3 - "$dir" <<'PY'
import json, os, re, subprocess, sys
d = json.loads(os.environ["HOOK_INPUT"]); proj = sys.argv[1]
cmd = str((d.get("tool_input") or {}).get("command", ""))
if not re.search(r"\b(cat|sed|head|tail|awk|less|grep|rg|nl)\b", cmd):
    sys.exit(0)
cwd = d.get("cwd") or proj
# `cd X && ...` / `cd X; ...` 를 따라 상대 경로의 기준을 옮긴다
m = re.search(r"\bcd\s+([^\s;&|]+)", cmd)
base = cwd
if m:
    base = m.group(1) if os.path.isabs(m.group(1)) else os.path.join(cwd, m.group(1))
seen = []
for tok in re.findall(r"[A-Za-z0-9_./\[\]@-]+\.(?:tsx?|css|mjs|sh)\b", cmd):
    p = tok if os.path.isabs(tok) else os.path.normpath(os.path.join(base, tok))
    if p not in seen and os.path.isfile(p):
        seen.append(p)
hook = os.path.join(proj, ".claude", "hooks", "precedent-context.sh")
for p in seen[:3]:
    ev = dict(d); ev["tool_name"] = "Read"; ev["tool_input"] = {"file_path": p}
    r = subprocess.run(["bash", hook], input=json.dumps(ev, ensure_ascii=False), capture_output=True, text=True,
                       env={**os.environ, "CLAUDE_PROJECT_DIR": proj})
    out = r.stdout.strip()
    if out:
        print(out)   # 첫 안내 하나만 낸다 (400B 상한은 원 훅이 지킨다)
        break
PY
