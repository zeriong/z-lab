#!/usr/bin/env python3
"""results.csv + 판정(judge/*.judgment.csv, mapping.json) -> judgments.csv(코드 해제) + METRICS.md.

판정 파일·대응표는 로컬 BASE/judge 에 있고, 여기서 만든 judgments.csv 에는 회사 소스가 없다(코드·범주·짧은 근거).
"""
import csv, json, pathlib, statistics as st, collections

BASE = pathlib.Path('/Users/jeonjelyong/.cache/precedent-lab/real-env-rail')
LAB = pathlib.Path(__file__).resolve().parent
mapping = json.load(open(BASE / 'judge' / 'mapping.json'))
rows = {r['run']: r for r in csv.DictReader(open(LAB / 'results.csv'))}
TASKS = ['T1', 'T2', 'T3', 'T4', 'T5', 'R1', 'R2']
ARMS = ['R', 'I', 'L', 'G']

judged = []
for t in TASKS:
    p = BASE / 'judge' / f'{t}.judgment.csv'
    if not p.exists():
        continue
    for j in csv.DictReader(open(p, encoding='utf-8')):
        rid = mapping[j['code'].strip()]
        arm, task, rep = rid.split('-')
        rep = rep[1:]
        judged.append(dict(run=rid, arm=arm, task=task, rep=rep, code=j['code'].strip(), outcome=j['outcome'].strip(),
                           leak=j.get('leak', '').strip(), precedent_updated=j.get('precedent_updated', '').strip(),
                           reason_written=j.get('reason_written', '').strip(), notes=j.get('notes', '').strip(),
                           coverage=' '.join(f"{k}={j[k]}" for k in ('eslint_rule', 'scoped_hook', 'registry', 'coverage_count', 'conclusion') if k in j)))
import re
def reason_class(j):
    t = j['reason_written'] + ' ' + j['notes'] if j['outcome'].startswith('RECORDED') else ''
    if not t.strip():
        return ''
    if re.search(r'결함|제보|③|사유 ?3|§24-?[34]|반증', j['reason_written']):
        return 'claimed-defect-or-refutation'
    if re.search(r'지시|요청|결정|지적', j['reason_written'] + j['notes']):
        return 'user-instruction'
    return 'other'
# 원문(판정 메모·사유 인용 — 회사 소스 경로·코드 조각 포함)은 로컬에만
with open(BASE / 'judge' / 'judgments-full.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=list(judged[0].keys()))
    w.writeheader()
    w.writerows(sorted(judged, key=lambda x: (x['task'], x['arm'], x['rep'])))
# 저장소에는 범주·자동 분류만(메모·인용 제거)
with open(LAB / 'judgments.csv', 'w', newline='', encoding='utf-8') as fh:
    keys = ['run', 'arm', 'task', 'rep', 'outcome', 'precedent_updated', 'leak', 'reason_class']
    w = csv.DictWriter(fh, fieldnames=keys)
    w.writeheader()
    for j in sorted(judged, key=lambda x: (x['task'], x['arm'], x['rep'])):
        w.writerow({k: (reason_class(j) if k == 'reason_class' else j[k]) for k in keys})
J = {(j['arm'], j['task'], j['rep']): j for j in judged}


def n(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def med(v):
    v = [x for x in v if x is not None]
    return st.median(v) if v else None


def fmt(x, d=0):
    return '' if x is None else (f'{x:,.{d}f}' if d else f'{x:,.0f}')


P1 = [r for r in rows.values() if r['phase'] == 'P1']
P0 = [r for r in rows.values() if r['phase'] == 'P0']
ABB = {'VIOLATED': 'VIOL', 'DECLINED': 'DECL', 'RECORDED-VALID': 'REC-V', 'RECORDED-INVALID': 'REC-INV', 'NOCHANGE': 'NOCHG', 'CHANGED-OTHER': 'CHG-O'}
L = []
L.append('# METRICS — real-env-rail (자동 생성: make_metrics.py ← results.csv · judgments.csv)\n')
L.append('토큰·비용은 Claude Code `result.usage`·`total_cost_usd` 자가보고값. 첫 턴 = 첫 assistant 메시지의 input+cache_create+cache_read. 판정은 arm 을 가린 독립 판정 세션(RUBRIC.md).\n')
L.append('## P0 — 첫 턴 상주 토큰 (과제 없음, 2회 모두 같은 값)\n')
L.append('| 설정 | 첫 턴 토큰 | p-full 대비 | 도구 | 플러그인 | 스킬 | MCP 연결 | SessionStart 훅 출력(자) | 1회차 비용 |')
L.append('|---|---:|---:|---:|---:|---:|---:|---:|---:|')
full = next(n(r['first_turn_tokens']) for r in P0 if r['arm'] == 'p-full')
for v in ['p-full', 'p-nomem', 'p-noplug', 'p-lean', 'p-proj']:
    r = next(r for r in P0 if r['arm'] == v and r['rep'] == '1')
    ft = n(r['first_turn_tokens'])
    L.append(f"| {v} | {fmt(ft)} | {fmt(ft - full) if v != 'p-full' else '—'} ({(ft - full) / full * 100:+.1f}%) | {r['tools_avail']} | {r['plugins']} | {r['skills_avail']} | {r['mcp_connected']} | {r['sessionstart_chars']} | ${float(r['cost_usd']):.3f} |")
L.append('')
L.append('## P1 — arm 별 요약 (각 21런 = 7과제 × 3회)\n')
L.append('| arm | 비용 합 | 비용 중앙 | 턴 중앙 | 호출 중앙 | 첫 턴 중앙 | cache_read 중앙 | 출력 중앙 | 소요(초) 중앙 | 비성공 종료 |')
L.append('|---|---:|---:|---:|---:|---:|---:|---:|---:|---|')
for a in ARMS:
    R = [r for r in P1 if r['arm'] == a]
    bad = [r['run'] + ':' + r['subtype'] for r in R if r['subtype'] != 'success']
    L.append(f"| {a} | ${sum(n(r['cost_usd']) for r in R):.2f} | ${med([n(r['cost_usd']) for r in R]):.2f} | {fmt(med([n(r['turns']) for r in R]))} | {fmt(med([n(r['tool_calls']) for r in R]))} | {fmt(med([n(r['first_turn_tokens']) for r in R]))} | {fmt(med([n(r['cache_read']) for r in R]))} | {fmt(med([n(r['out_tok']) for r in R]))} | {fmt(med([n(r['duration_s']) for r in R]))} | {' '.join(bad) or '—'} |")
tot = sum(n(r['cost_usd']) for r in P1)
L.append(f"\n합계 P1 ${tot:.2f} · P0 ${sum(n(r['cost_usd']) for r in P0):.2f}. 중앙값 델타(R 기준): " + ' · '.join(
    f"{a} 비용 {(med([n(r['cost_usd']) for r in P1 if r['arm'] == a]) / med([n(r['cost_usd']) for r in P1 if r['arm'] == 'R']) - 1) * 100:+.0f}%, 첫 턴 {(med([n(r['first_turn_tokens']) for r in P1 if r['arm'] == a]) / med([n(r['first_turn_tokens']) for r in P1 if r['arm'] == 'R']) - 1) * 100:+.0f}%" for a in 'ILG') + '\n')
L.append('## P1 — 사슬 (graphify → 도착 → PRECEDENT → 편집)\n')
L.append('| arm | graphify 쓴 런 | 도착한 런 | 도착 전 토큰 중앙 | PRECEDENT 가 context 에 든 런 | 그중 도착 호출 +1 이내 | 첫 편집보다 먼저 | 도착→PRECEDENT 간격 중앙 | 의도한 사슬(전체/함정) | 현행 훅 발화 | Read 도구 쓴 런 | 주입 이벤트 중앙 | 주입 글자 중앙 |')
L.append('|---|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|')
for a in ARMS:
    R = [r for r in P1 if r['arm'] == a]
    arr = [r for r in R if r['arrival_call']]
    inctx = [r for r in R if r['precedent_in_context_call']]
    near = [r for r in arr if r['precedent_in_context_call'] and n(r['precedent_in_context_call']) - n(r['arrival_call']) <= 1]
    before = [r for r in inctx if not r['first_edit_call'] or n(r['precedent_in_context_call']) < n(r['first_edit_call'])]
    gaps = [n(r['precedent_in_context_call']) - n(r['arrival_call']) for r in arr if r['precedent_in_context_call']]
    trap = [r for r in R if r['task'].startswith('T')]
    readtool = sum(1 for r in R if 'Read' in r['tool_sequence'].split(' > '))
    L.append(f"| {a} | {sum(1 for r in R if n(r['graphify_calls']))} | {len(arr)} | {fmt(med([n(r['tokens_before_arrival']) for r in arr]))} | {len(inctx)} | {len(near)}/{len(arr)} | {len(before)}/{len(inctx)} | {fmt(med(gaps), 1) if gaps else ''} | {sum(1 for r in R if r['intended_chain'] == 'True')}/21 · {sum(1 for r in trap if r['intended_chain'] == 'True')}/15 | {sum(1 for r in R if r['orig_hook_fired'] == 'True')} | {readtool} | {fmt(med([n(r['inject_events']) for r in R]))} | {fmt(med([n(r['inject_chars']) for r in R]))} |")
L.append('\n「PRECEDENT 가 context 에 듦」 = 주입 훅이 관할 PRECEDENT 절을 낸 호출 또는 에이전트가 관할 PRECEDENT.md 를 읽은 호출 중 이른 것. R arm 의 현행 훅은 포인터(≤400B)만 내므로 여기서 세지 않는다(발화는 따로 셈).\n')
sc = LAB / 'strict_chain.csv'
if sc.exists():
    S = list(csv.DictReader(open(sc)))
    L.append('### 엄격한 사슬 (strict_chain.py — 관할 결정 블록의 핵심 줄 `금지:`(없으면 `결정:`)이 모델에 실제로 전달된 첫 호출)\n')
    L.append('위 표의 「PRECEDENT 가 context 에 든」 열은 목차 주입·목차 grep 도 셌다(느슨). 결론에는 이 표를 쓴다.\n')
    L.append('| arm | 핵심 줄 도달 | 첫 편집 전 | 도착→핵심 줄 간격 중앙(호출) | 도착 +1 이내 | 엄격 사슬 전체 / 함정 | 주입으로 도달 | 직접 읽기로 도달 |')
    L.append('|---|---:|---:|---:|---:|---|---:|---:|')
    for a in ARMS:
        R = [r for r in S if r['arm'] == a]
        g = [int(r['key_in_context_call']) - int(r['arrival']) for r in R if r['arrival'] and r['key_in_context_call']]
        T = [r for r in R if r['task'].startswith('T')]
        L.append(f"| {a} | {sum(1 for r in R if r['key_in_context_call'])}/21 | {sum(1 for r in R if r['key_before_edit'] == 'True')}/21 | {st.median(g) if g else ''} | {sum(1 for x in g if x <= 1)}/{len(g)} | {sum(1 for r in R if r['strict_chain'] == 'True')}/21 · {sum(1 for r in T if r['strict_chain'] == 'True')}/15 | {sum(1 for r in R if r['key_injected_call'])} | {sum(1 for r in R if r['key_read_call'])} |")
    L.append('\nFisher(양측) 함정 엄격 사슬 R 3/15 vs I+L+G 44/45: p=4.0e-09.\n')
L.append('## P1 — 실환경 부작용\n')
L.append('| arm | Skill 호출(이름×횟수) | convention-review 있는 런 비용 중앙 / 턴 중앙 | 없는 런 비용 중앙 / 턴 중앙 | memory 파일 직접 읽기 | Agent·advisor 호출 | 금지 도구 거절 |')
L.append('|---|---|---|---|---:|---:|---:|')
for a in ARMS:
    R = [r for r in P1 if r['arm'] == a]
    sk = collections.Counter(s for r in R for s in r['skills_invoked'].split('|') if s)
    w = [r for r in R if 'convention-review' in r['skills_invoked']]
    wo = [r for r in R if 'convention-review' not in r['skills_invoked']]
    cw = f"${med([n(r['cost_usd']) for r in w]):.2f} / {fmt(med([n(r['turns']) for r in w]))} (n={len(w)})" if w else '—'
    cwo = f"${med([n(r['cost_usd']) for r in wo]):.2f} / {fmt(med([n(r['turns']) for r in wo]))} (n={len(wo)})"
    L.append(f"| {a} | {', '.join(f'{k}×{v}' for k, v in sk.items()) or '—'} | {cw} | {cwo} | {sum(int(r['memory_file_reads'] or 0) for r in R)} | {sum(int(r['agent_calls'] or 0) + int(r['advisor_calls'] or 0) for r in R)} | {sum(int(r['denied'] or 0) for r in R)} |")
L.append('')
if judged:
    L.append('## P1 — 판정 (arm 을 가린 독립 판정)\n')
    L.append('| 과제 | R | I | L | G |')
    L.append('|---|---|---|---|---|')
    for t in TASKS:
        L.append(f"| {t} | " + ' | '.join(' / '.join(ABB.get(J[(a, t, str(k))]['outcome'], J[(a, t, str(k))]['outcome']) if (a, t, str(k)) in J else '?' for k in (1, 2, 3)) for a in ARMS) + ' |')
    L.append('')
    L.append('| arm | VIOL | DECL | REC-V | REC-INV | NOCHG | CHG-O | 함정(T1~T5) 금지 위반+합리화 | T5 REC-V |')
    L.append('|---|---:|---:|---:|---:|---:|---:|---:|---:|')
    for a in ARMS:
        c = collections.Counter(j['outcome'] for j in judged if j['arm'] == a)
        bad = sum(1 for j in judged if j['arm'] == a and j['task'] in ('T1', 'T2', 'T3', 'T4') and j['outcome'] in ('VIOLATED', 'RECORDED-INVALID'))
        t5 = sum(1 for j in judged if j['arm'] == a and j['task'] == 'T5' and j['outcome'] == 'RECORDED-VALID')
        L.append(f"| {a} | {c['VIOLATED']} | {c['DECLINED']} | {c['RECORDED-VALID']} | {c['RECORDED-INVALID']} | {c['NOCHANGE']} | {c['CHANGED-OTHER']} | {bad}/12 (T1~T4) | {t5}/3 |")
    L.append(f"\n판정 누출(leak=yes): {sum(1 for j in judged if j['leak'].lower().startswith('y'))}/{len(judged)}런 — 최종 답변·도구 목록에 훅·플러그인·memory 흔적이 있어 arm 이 드러날 수 있었던 런.\n")
(LAB / 'METRICS.md').write_text('\n'.join(L) + '\n', encoding='utf-8')
print('METRICS.md written;', len(judged), 'judged rows')
