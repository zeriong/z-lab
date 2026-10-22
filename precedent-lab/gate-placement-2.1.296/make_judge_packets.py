#!/usr/bin/env python3
"""과제별 판정 패킷(arm 을 가린 무작위 코드) — 회사 소스(diff)가 들어가므로 로컬 BASE/judge/ 에만 쓴다.
대응표(code → run)는 BASE/judge/mapping.json. 판정 뒤 이 저장소로 옮긴다(소스 없음).
"""
import json, pathlib, random, re

BASE = pathlib.Path('/Users/jeonjelyong/.cache/precedent-lab/gate-placement')
WTR = pathlib.Path('/Users/jeonjelyong/.cache/precedent-lab/real-env-rail/wt-R')
LAB = pathlib.Path(__file__).resolve().parent
tasks = json.load(open(LAB / 'tasks.json'))
DEC = {'T1': ('apps/REDACTED-app/features/REDACTED-dir-35/PRECEDENT.md', '§REDACTED-slug-10'),
       'T2': ('.claude/hooks/PRECEDENT.md', '§fail-open'),
       'T3': ('.claude/hooks/PRECEDENT.md', '§REDACTED-slug-08'),
       'T4': ('apps/REDACTED-app/features/REDACTED-dir-37/PRECEDENT.md', '§REDACTED-slug-07'),
       'T5': ('apps/REDACTED-app/app/PRECEDENT.md', '§REDACTED-slug-04'),
       'R1': ('apps/REDACTED-app/features/REDACTED-dir-35/PRECEDENT.md', '§REDACTED-slug-03'),
       'R2': ('apps/REDACTED-app/features/REDACTED-dir-35/PRECEDENT.md', '§REDACTED-slug-02')}
rng = random.Random(20261017)
out = BASE / 'judge'; out.mkdir(exist_ok=True)
mapping = {}


def decision_text(task):
    p, slug = DEC[task]
    # 작업 트리에는 직전 런의 변경이 남아 있을 수 있다 — 커밋 원문(HEAD)에서 읽는다
    lines = __import__('subprocess').run(['git', '-C', str(WTR), 'show', 'HEAD:' + p], capture_output=True, text=True).stdout.split('\n')
    s = next(i for i, l in enumerate(lines) if l.startswith('### ' + slug))
    e = next((i for i in range(s + 1, len(lines)) if lines[i].startswith('### ') or lines[i].startswith('## ')), len(lines))
    return '\n'.join(lines[s:e])


def run_view(rid):
    final, calls = '', []
    for line in open(BASE / 'runs' / f'{rid}.jsonl', errors='ignore'):
        try:
            e = json.loads(line)
        except ValueError:
            continue
        if e.get('type') == 'result':
            final = e.get('result') or ''
        msg = e.get('message') if isinstance(e.get('message'), dict) else None
        for b in (msg or {}).get('content') or []:
            if isinstance(b, dict) and b.get('type') == 'tool_use':
                inp = b.get('input') or {}
                d = ' '.join(str(inp.get(k, '')) for k in ('file_path', 'command', 'pattern', 'path', 'skill'))
                calls.append(f"{b.get('name')}: {d[:200]}")
    diff = (BASE / 'diffs' / f'{rid}.diff').read_text(errors='ignore')
    full_diff = diff
    if len(diff) > 30000:
        diff = diff[:30000] + f'\n…(diff 잘림, 전체 {len(diff)}자)'
    return final, calls, diff, full_diff


for task in [t for t in tasks if t.startswith('T')]:
    rids = sorted(p.stem for p in (BASE / 'runs').glob(f'[CHA]-xh-{task}-r[123].jsonl'))
    rng.shuffle(rids)
    parts = [f"# 판정 패킷 — {task}\n\n## 과제 프롬프트\n\n{tasks[task]['prompt']}\n\n## 관할 결정 원문 ({DEC[task][0]})\n\n{decision_text(task)}\n"]
    for i, rid in enumerate(rids, 1):
        code = f'{task}-{i:02d}'
        mapping[code] = rid
        final, calls, diff, full_diff = run_view(rid)
        prec = bool(re.search(r'^diff --git a/\S*PRECEDENT\.md ', full_diff, re.M))
        parts.append(f"\n---\n\n## {code}\n\n### 최종 답변\n\n{final}\n\n### PRECEDENT.md 변경: {'있음' if prec else '없음'}\n\n### 도구 호출 ({len(calls)})\n\n" +
                     '\n'.join(f'{n}. {c}' for n, c in enumerate(calls, 1)) + f"\n\n### diff\n\n```diff\n{diff}\n```\n")
    (out / f'{task}.md').write_text(''.join(parts), encoding='utf-8')
    print(task, len(rids), 'runs', (out / f'{task}.md').stat().st_size, 'bytes')
json.dump(mapping, open(out / 'mapping.json', 'w'), indent=1)
