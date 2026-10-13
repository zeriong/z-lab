#!/usr/bin/env python3
"""x-isolate 6런(T2·T3) 판정 패킷 — 본 패킷과 같은 형식, 별도 무작위 코드. 로컬 BASE/judge/ 에만 쓴다."""
import json, pathlib, random, re

BASE = pathlib.Path('/Users/jeonjelyong/.cache/precedent-lab/real-env-rail')
LAB = pathlib.Path(__file__).resolve().parent.parent
tasks = json.load(open(LAB / 'tasks.json'))
# make_judge_packets.py 는 실행 시 본 패킷을 다시 쓰므로 import 하지 않고 필요한 함수만 여기 둔다
DEC = {'T2': ('.claude/hooks/PRECEDENT.md', '§fail-open'), 'T3': ('.claude/hooks/PRECEDENT.md', '§token-word-boundary')}


def decision_text(task):
    p, slug = DEC[task]
    # 작업 트리에는 직전 런의 변경이 남아 있을 수 있다 — 커밋 원문(HEAD)에서 읽는다
    lines = __import__('subprocess').run(['git', '-C', str(BASE / 'wt-R'), 'show', 'HEAD:' + p], capture_output=True, text=True).stdout.split('\n')
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
    full = (BASE / 'diffs' / f'{rid}.diff').read_text(errors='ignore')
    return final, calls, full


rng = random.Random(20261014)
mapping = {}
for task in ('T2', 'T3'):
    rids = sorted(p.stem for p in (BASE / 'runs').glob(f'x-R-{task}-r[123].jsonl'))
    rng.shuffle(rids)
    parts = [f"# 판정 패킷 — X{task}\n\n## 과제 프롬프트\n\n{tasks[task]['prompt']}\n\n## 관할 결정 원문 ({DEC[task][0]})\n\n{decision_text(task)}\n"]
    for i, rid in enumerate(rids, 1):
        code = f'X{task}-{i:02d}'
        mapping[code] = rid
        final, calls, full = run_view(rid)
        prec = bool(re.search(r'^diff --git a/\S*PRECEDENT\.md ', full, re.M))
        parts.append(f"\n---\n\n## {code}\n\n### 최종 답변\n\n{final}\n\n### PRECEDENT.md 변경: {'있음' if prec else '없음'}\n\n### 도구 호출 ({len(calls)})\n\n" +
                     '\n'.join(f'{n}. {c}' for n, c in enumerate(calls, 1)) + f"\n\n### diff\n\n```diff\n{full[:30000]}\n```\n")
    (BASE / 'judge' / f'X{task}.md').write_text(''.join(parts), encoding='utf-8')
    print(f'X{task}', len(rids))
json.dump(mapping, open(BASE / 'judge' / 'mapping-x.json', 'w'), indent=1)
