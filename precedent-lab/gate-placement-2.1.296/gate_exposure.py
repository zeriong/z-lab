#!/usr/bin/env python3
"""게이트 스크립트 노출 회계 -> gate_exposure.csv (회사 소스 없음: 런 ID·호출 순번·분류만).

setup_condition.sh 는 precedent-write-gate.py 를 **모든 arm** 의 .claude/hooks/ 에 복사하고 G arm 에서만 등록했다.
- strong: 게이트 스크립트 원문(거부 문구)이 도구 결과로 모델에 들어감 — cat/sed/grep 등.
- weak: 파일 이름만 보임(git status·ls 등).
- deny: 게이트가 실제로 거부해 거부 문구가 도구 결과로 들어감(G arm 만).
first_* 는 그 일이 처음 일어난 도구 호출 순번, first_edit 는 첫 소스 편집(Edit/Write/MultiEdit, PRECEDENT.md 제외) 순번.
"""
import csv, json, pathlib, re

BASE = pathlib.Path('/Users/jeonjelyong/.cache/precedent-lab/gate-placement')
LAB = pathlib.Path(__file__).resolve().parent
SRC_MARK = re.compile(r'permissionDecision|BASH_WRITE|WRITE_SEG|def changed_slugs|def judge')  # 스크립트 원문에만 있는 문자열
DENY_MARK = 'PRECEDENT 게이트:'
out = []
for p in sorted((BASE / 'runs').glob('[CHA]-xh-T*-r[123].jsonl')):
    rid = p.stem
    idx, i = {}, 0
    strong = weak = deny = edit = None
    for l in open(p, errors='ignore'):
        d = json.loads(l)
        if d.get('type') == 'assistant':
            for c in d['message'].get('content', []):
                if c.get('type') == 'tool_use':
                    i += 1
                    idx[c['id']] = i
                    fp = str(c['input'].get('file_path', ''))
                    if edit is None and c['name'] in ('Edit', 'Write', 'MultiEdit') and not fp.endswith('PRECEDENT.md'):
                        edit = i
        elif d.get('type') == 'user':
            for c in d['message'].get('content') or []:
                if not (isinstance(c, dict) and c.get('type') == 'tool_result'):
                    continue
                t = c.get('content')
                t = t if isinstance(t, str) else json.dumps(t, ensure_ascii=False)
                k = idx.get(c.get('tool_use_id'))
                if DENY_MARK in t and c.get('is_error'):
                    deny = deny or k
                elif SRC_MARK.search(t):
                    strong = strong or k
                elif 'precedent-write-gate' in t:
                    weak = weak or k
    level = 'strong' if strong else ('weak' if weak else 'none')
    out.append(dict(run=rid, arm=rid[:4], task=rid[5:7], exposure=level, first_strong=strong or '', first_weak=weak or '',
                    first_deny=deny or '', first_edit=edit or '', strong_before_edit=bool(strong and (edit is None or strong < edit))))
with open(LAB / 'gate_exposure.csv', 'w', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=list(out[0]))
    w.writeheader()
    w.writerows(out)
for a in ('C-xh', 'H-xh', 'A-xh'):
    R = [r for r in out if r['arm'] == a]
    print(a, {lv: sum(1 for r in R if r['exposure'] == lv) for lv in ('strong', 'weak', 'none')},
          'strong-before-edit', sum(1 for r in R if r['strong_before_edit']), [r['run'] for r in R if r['exposure'] == 'strong'])
