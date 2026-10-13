#!/usr/bin/env python3
"""게이트 v2 결정론 스모크 — 실행 전 고정. 명령 형태는 plan-rail 오탐·정탐을 본뜬 합성(회사 소스 없음)."""
import json, os, pathlib, subprocess, sys, tempfile

GATE = pathlib.Path(__file__).resolve().parent / 'hooks' / 'precedent-write-gate.py'
PREC = """# PRECEDENT — x

## a.ts

### §keep-flat — 번호를 당기지 않는다

- 결정: 닫힌 번호는 비운다.
- 금지: 닫은 뒤 번호를 당겨 매기기.

### §other — 다른 결정

- 결정: 그대로.
"""


def run(tool, ti, d):
    p = subprocess.run([sys.executable, str(GATE)], input=json.dumps({'tool_name': tool, 'tool_input': ti, 'cwd': d}),
                       capture_output=True, text=True, env={**os.environ, 'PRECEDENT_LAB_LOG': ''})
    return 'deny' if '"deny"' in p.stdout else 'allow'


with tempfile.TemporaryDirectory() as d:
    f = os.path.join(d, 'PRECEDENT.md')
    pathlib.Path(f).write_text(PREC)
    new_ok = '\n### §fresh — 새 결정\n\n- 결정: 새 것.\n'
    cases = [
        # Edit / Write
        ('deny', 'Edit', {'file_path': f, 'old_string': '- 금지: 닫은 뒤 번호를 당겨 매기기.', 'new_string': '- 금지: 없음.'}),
        ('deny', 'Edit', {'file_path': f, 'old_string': '- 결정: 닫힌 번호는 비운다.\n', 'new_string': '- 결정: 닫힌 번호는 비운다.\n- 예외: 당긴다.\n'}),
        ('deny', 'Write', {'file_path': f, 'content': PREC.replace('### §other — 다른 결정\n\n- 결정: 그대로.\n', '')}),
        ('deny', 'Edit', {'file_path': f, 'old_string': '- 결정: 그대로.\n', 'new_string': '- 결정: 그대로.\n\n### §pull — 닫으면 당긴다\n\n- 결정: §keep-flat 대신 당긴다.\n'}),
        ('deny', 'Edit', {'file_path': f, 'old_string': '- 결정: 그대로.\n', 'new_string': '- 결정: 그대로.\n\n### §pull — 닫으면 당긴다\n\n- 사유: §24 무효화 ③.\n'}),
        ('allow', 'Edit', {'file_path': f, 'old_string': '- 결정: 그대로.\n', 'new_string': '- 결정: 그대로.\n' + new_ok}),
        ('allow', 'Write', {'file_path': f, 'content': PREC + new_ok}),
        ('allow', 'Edit', {'file_path': os.path.join(d, 'a.ts'), 'old_string': 'x', 'new_string': 'y'}),
        # Bash 쓰기 대상
        ('deny', 'Bash', {'command': "sed -i '' 's/당겨/비워/' PRECEDENT.md"}),
        ('deny', 'Bash', {'command': "perl -pi -e 's/a/b/' x/PRECEDENT.md"}),
        ('deny', 'Bash', {'command': 'echo "- 금지: 없음" >> PRECEDENT.md'}),
        ('deny', 'Bash', {'command': "cat > x/PRECEDENT.md <<'EOF'\n# x\nEOF"}),
        ('deny', 'Bash', {'command': 'printf x | tee -a PRECEDENT.md'}),
        ('deny', 'Bash', {'command': 'rm x/PRECEDENT.md'}),
        ('deny', 'Bash', {'command': 'mv /tmp/p.md x/PRECEDENT.md'}),
        ('deny', 'Bash', {'command': 'cp /tmp/p.md x/PRECEDENT.md'}),
        ('deny', 'Bash', {'command': 'git checkout -- a.ts x/PRECEDENT.md'}),
        # Bash 통과 (plan-rail 오탐 형태 포함)
        ('allow', 'Bash', {'command': 'cat PRECEDENT.md'}),
        ('allow', 'Bash', {'command': "sed -n '1,20p' PRECEDENT.md"}),
        ('allow', 'Bash', {'command': 'sed -n "/-limit/p" PRECEDENT.md'}),
        ('allow', 'Bash', {'command': 'grep -n "금지" x/PRECEDENT.md | head'}),
        ('allow', 'Bash', {'command': "cd x && python3 - <<'EOF'\np='a.ts'\ns=open(p).read()\ns=s.replace('a','// WHY: 비운다 (PRECEDENT ../../PRECEDENT.md §keep-flat)')\nopen(p,'w').write(s)\nEOF"}),
        ('allow', 'Bash', {'command': 'F="a.ts b.tsx" && git diff --stat -- $F x/PRECEDENT.md && git diff -- $F > /tmp/p.patch && git checkout -- $F && git status --short'}),
        ('allow', 'Bash', {'command': 'cp x/PRECEDENT.md /tmp/backup.md'}),
        ('allow', 'Bash', {'command': 'git diff -- x/PRECEDENT.md'}),
    ]
    bad = []
    for want, tool, ti in cases:
        got = run(tool, ti, d)
        if got != want:
            bad.append((want, got, tool, str(ti)[:90]))
    assert pathlib.Path(f).read_text() == PREC  # 게이트는 파일을 바꾸지 않는다
print(f'{len(cases) - len(bad)}/{len(cases)} pass')
for b in bad:
    print('FAIL', b)
sys.exit(1 if bad else 0)
