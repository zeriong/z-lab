#!/usr/bin/env python3
"""엄격한 사슬 지표 — 「관할 결정 블록의 핵심 줄(금지:, 없으면 결정:)이 모델에 실제로 전달된 첫 호출」.

느슨한 지표(analyze.py 의 precedent_in_context_call)는 목차 주입(index)·목차 grep 도 「근거 도착」으로 셌다.
- 주입: 훅 로그의 (file, mode) 를 커밋 원문(HEAD)으로 다시 렌더링해 핵심 줄 포함 여부를 본다(render 는 결정론적).
- 직접 읽기: tool_result 본문에 핵심 줄(앞 40자)이 처음 나타난 호출.
출력: strict_chain.csv(런별) + 표준출력 요약.
"""
import csv, importlib.util, json, pathlib, re, subprocess, sys, tempfile, os

BASE = pathlib.Path('/Users/jeonjelyong/.cache/precedent-lab/real-env-rail')
LAB = pathlib.Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('inj', LAB / 'hooks' / 'precedent-inject.py')
inj = importlib.util.module_from_spec(spec); spec.loader.exec_module(inj)
DEC = {'T1': ('apps/REDACTED-app/features/REDACTED-dir-35/PRECEDENT.md', '§REDACTED-slug-10'),
       'T2': ('.claude/hooks/PRECEDENT.md', '§fail-open'),
       'T3': ('.claude/hooks/PRECEDENT.md', '§REDACTED-slug-08'),
       'T4': ('apps/REDACTED-app/features/REDACTED-dir-37/PRECEDENT.md', '§REDACTED-slug-07'),
       'T5': ('apps/REDACTED-app/app/PRECEDENT.md', '§REDACTED-slug-04'),
       'R1': ('apps/REDACTED-app/features/REDACTED-dir-35/PRECEDENT.md', '§REDACTED-slug-03'),
       'R2': ('apps/REDACTED-app/features/REDACTED-dir-35/PRECEDENT.md', '§REDACTED-slug-02')}

# 커밋 원문을 임시 트리에 풀어 render() 를 그대로 돌린다(작업 트리 오염 회피)
tmp = pathlib.Path(tempfile.mkdtemp())
subprocess.run(f"git -C {BASE/'wt-R'} archive HEAD | tar -x -C {tmp}", shell=True, check=True)
(tmp / '.git').mkdir(exist_ok=True)


def key_line(task):
    p, slug = DEC[task]
    lines = (tmp / p).read_text(encoding='utf-8').split('\n')
    s = next(i for i, l in enumerate(lines) if l.startswith('### ' + slug))
    e = next((i for i in range(s + 1, len(lines)) if lines[i].startswith('### ') or lines[i].startswith('## ')), len(lines))
    block = lines[s:e]
    k = next((l for l in block if l.startswith('- 금지:')), None) or next((l for l in block if l.startswith('- 결정:')), None)
    return k.strip()


KEY = {t: key_line(t) for t in DEC}
render_cache = {}


def rendered_has_key(task, relfile):
    f = tmp / relfile
    if (task, relfile) not in render_cache:
        prec = inj.nearest_precedent(str(f), str(tmp))
        out = ''
        if prec and os.path.relpath(prec, tmp) == DEC[task][0]:
            out = inj.render(prec, str(tmp), f.name)[1]
        k = KEY[task]
        render_cache[(task, relfile)] = (k[:40] in out) or (k[:40].replace('- 금지:', '').strip()[:30] in out and '금지' in out)
    return render_cache[(task, relfile)]


res = {r['run']: r for r in csv.DictReader(open(LAB / 'results.csv'))}
rows = []
for f in sorted((BASE / 'runs').glob('[RILG]-*-r[123].jsonl')):
    rid = f.stem; arm, task, rep = rid.split('-')
    calls, id2idx, read_first = [], {}, None
    k40 = KEY[task][:40]
    for line in open(f, errors='ignore'):
        try:
            e = json.loads(line)
        except ValueError:
            continue
        msg = e.get('message') if isinstance(e.get('message'), dict) else None
        for b in (msg or {}).get('content') or []:
            if not isinstance(b, dict):
                continue
            if b.get('type') == 'tool_use':
                calls.append(b.get('id')); id2idx[b.get('id')] = len(calls)
            elif b.get('type') == 'tool_result' and read_first is None:
                c = b.get('content'); s = c if isinstance(c, str) else json.dumps(c, ensure_ascii=False)
                if k40 in s:
                    read_first = id2idx.get(b.get('tool_use_id'))
    inj_first = None
    hp = BASE / 'logs' / f'{rid}.hook.jsonl'
    if hp.exists():
        for h in (json.loads(l) for l in hp.open() if l.strip()):
            if h.get('mode') in ('full', 'compact', 'compact-cut') and h.get('tool_use_id') in id2idx and rendered_has_key(task, h['file']):
                i = id2idx[h['tool_use_id']]
                inj_first = i if inj_first is None else min(inj_first, i)
    first = min([x for x in (inj_first, read_first) if x is not None], default=None)
    r = res[rid]
    arr = int(r['arrival_call']) if r['arrival_call'] else None
    edit = int(r['first_edit_call']) if r['first_edit_call'] else None
    chain = first is not None and (edit is None or first < edit) and (arr is None or first - arr <= 1)
    before_edit = first is not None and (edit is None or first < edit)
    rows.append(dict(run=rid, arm=arm, task=task, rep=rep[1:], arrival=arr or '', key_injected_call=inj_first or '', key_read_call=read_first or '',
                     key_in_context_call=first or '', first_edit=edit or '', key_before_edit=before_edit, strict_chain=chain))

with open(LAB / 'strict_chain.csv', 'w', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
print('key lines:', {t: KEY[t][:30] for t in KEY})
for a in 'RILG':
    R = [r for r in rows if r['arm'] == a]; T = [r for r in R if r['task'].startswith('T')]
    print(a, '핵심줄 context 도달', sum(1 for r in R if r['key_in_context_call']), '/21',
          '| 첫 편집 전', sum(1 for r in R if r['key_before_edit']), '/21',
          '| 엄격 사슬 전체', sum(1 for r in R if r['strict_chain']), '/21 · 함정', sum(1 for r in T if r['strict_chain']), '/15',
          '| 주입으로 도달', sum(1 for r in R if r['key_injected_call']), '| 직접 읽기로 도달', sum(1 for r in R if r['key_read_call']))
