#!/usr/bin/env python3
"""D arm 의 Bash 읽기 감지 훅 시제품 스모크 테스트. 합성 PostToolUse(Bash) 이벤트를 넣고 출력을 본다."""
import json
import os
import pathlib
import subprocess
import time

WT = '/tmp/precedent-lab/r3/wt-D'
TMP = pathlib.Path('/private/tmp/claude-501/-Users-jeonjelyong-WorkSpace-Z-Work---private--BLOG-POSTING/7a307a4a-de53-4ade-88c5-caef30e4c1c9/scratchpad') / f'hook-smoke-{int(time.time())}'
TMP.mkdir(parents=True, exist_ok=True)
env = {**os.environ, 'CLAUDE_PROJECT_DIR': WT, 'TMPDIR': str(TMP)}


def probe(label, cmd):
    ev = {"tool_name": "Bash", "session_id": "smoke-d", "agent_id": "", "cwd": WT, "tool_input": {"command": cmd}}
    r = subprocess.run(['bash', '.claude/hooks/precedent-context-bash.sh'], input=json.dumps(ev, ensure_ascii=False),
                       capture_output=True, text=True, cwd=WT, env=env)
    raw = (r.stdout or '').strip()
    try:
        d = json.loads(raw)
        print(f"{label}\n  -> {d['hookSpecificOutput']['additionalContext'][:170]}")
    except Exception:
        print(f"{label}\n  -> (출력 없음/비JSON) stdout={raw[:160]!r} stderr={(r.stderr or '')[:200]!r}")


probe("1) cd 뒤 상대경로 cat", "cd apps/ehr-admin/features/pane-workspace && cat -n model/utils/pane-url.ts; ls")
probe("2) 루트 상대 sed (훅 디렉터리)", "sed -n 1,40p .claude/hooks/commit-gate.sh")
probe("3) grep 로 파일 열기", 'grep -rn "@6xl" apps/ehr-admin/features/patient-detail/ui/patient-detail-shell.tsx')
probe("4) 같은 파일 재읽기 (중복 억제 → 출력 없어야)", "cat .claude/hooks/commit-gate.sh")
marks = list((TMP / 'claude-precedent-smoke-d').rglob('*'))
print("마커 파일:", sum(1 for m in marks if m.is_file()), "개")
