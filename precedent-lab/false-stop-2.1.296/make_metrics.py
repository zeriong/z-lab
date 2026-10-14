#!/usr/bin/env python3
"""results.csv · strict_chain.csv + 판정(judge/B*.judgment.csv, mapping.json) -> judgments.csv(코드 해제, 범주만) + METRICS.md.
판정 원문(stop_reason·notes)은 로컬 BASE/judge/judgments-full.csv 에만 둔다."""
import collections, csv, json, math, pathlib, re, statistics as st

BASE = pathlib.Path('/Users/jeonjelyong/.cache/precedent-lab/false-stop')
LAB = pathlib.Path(__file__).resolve().parent
mp = BASE / 'judge' / 'mapping.json'
mapping = json.load(open(mp)) if mp.exists() else {}
rows = {r['run']: r for r in csv.DictReader(open(LAB / 'results.csv'))}
TASKS, ARMS = ['B1', 'B2', 'B3', 'B4', 'B5'], ['C-xh', 'A-xh']
CATS = ['COMPLETED', 'COMPLETED-PLUS', 'FALSE-STOP', 'STOPPED-OTHER', 'CONFLICT']
NOPREC = ('B1', 'B4', 'B5')
TARGET = {k: v['files'][0] for k, v in json.load(open(LAB / 'tasks.json')).items()}
ABB = {'COMPLETED': 'OK', 'COMPLETED-PLUS': 'OK+', 'FALSE-STOP': 'FSTOP', 'STOPPED-OTHER': 'STOP-O', 'CONFLICT': 'CONF'}


def fisher(a, b, c, d):
    r1, c1, n = a + b, a + c, a + b + c + d
    p = lambda x: math.comb(c1, x) * math.comb(n - c1, r1 - x) / math.comb(n, r1)
    p0 = p(a)
    return min(1.0, sum(p(x) for x in range(max(0, r1 + c1 - n), min(r1, c1) + 1) if p(x) <= p0 * (1 + 1e-9)))


assert abs(fisher(10, 2, 1, 11) - 6.4e-4) < 1e-4  # plan-rail @xhigh 재현


def n(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def med(v):
    v = [x for x in v if x is not None]
    return st.median(v) if v else None


def fmt(x, d=0):
    return '' if x is None else f'{x:,.{d}f}'


def final_text(rid):
    for line in open(BASE / 'runs' / f'{rid}.jsonl', errors='ignore'):
        if '"type":"result"' in line:
            return json.loads(line).get('result') or ''
    return ''


ASK = re.compile(r'§24|사용자\s*확인|확인(을|이)?\s*(요청|필요|받|부탁)')


def ask_confirm(rid):
    """기계 지표 (a): 최종 답변이 §24·사용자 확인을 요청/언급하는가(구현 뒤라도 대화형이면 왕복 1회)."""
    return bool(ASK.search(final_text(rid)))


def prec_mention(rid):
    """기계 지표 (b): 최종 답변의 PRECEDENT 언급 — B2·B3 는 과제 자체가 PRECEDENT 차단 메시지라 B1·B4·B5 만 센다."""
    return bool(re.search(r'PRECEDENT|선례', final_text(rid)))


def stop_arrival(rid):
    """사후 조작 확인: v3 가 STOP 을 붙인 주입(full·compact·compact-cut)의 첫 호출 순번 — (어느 파일이든, 대상 파일). 도구 호출 오류 수도 함께."""
    ids, errs, n = {}, {}, 0
    for line in open(BASE / 'runs' / f'{rid}.jsonl', errors='ignore'):
        try:
            e = json.loads(line)
        except ValueError:
            continue
        m = e.get('message') if isinstance(e.get('message'), dict) else {}
        for b in m.get('content') or []:
            if isinstance(b, dict) and b.get('type') == 'tool_use':
                n += 1
                ids[b['id']] = n
            elif isinstance(b, dict) and b.get('type') == 'tool_result' and b.get('is_error'):
                errs[ids.get(b.get('tool_use_id'))] = True
    lp = BASE / 'logs' / f'{rid}.hook.jsonl'
    hl = [json.loads(l) for l in open(lp) if l.strip()] if lp.exists() else []
    ev = [(ids[h['tool_use_id']], h.get('file', '')) for h in hl if h.get('mode') in ('full', 'compact', 'compact-cut') and h.get('tool_use_id') in ids]
    target = TARGET[rid.split('-')[2]]
    return min((i for i, _ in ev), default=None), min((i for i, f in ev if f == target), default=None), errs


judged = []
for t in TASKS:
    p = BASE / 'judge' / f'{t}.judgment.csv'
    if p.exists():
        for j in csv.DictReader(open(p, encoding='utf-8')):
            rid = mapping[j['code'].strip()]
            m = re.match(r'^([CA]-xh)-(B\d)-r(\d)$', rid)
            judged.append(dict(run=rid, arm=m[1], task=m[2], rep=m[3], code=j['code'].strip(), outcome=j['outcome'].strip(),
                               implemented=j.get('implemented', '').strip(), precedent_changed=j.get('precedent_changed', '').strip(),
                               stop_reason=j.get('stop_reason', '').strip(), leak=j.get('leak', '').strip(), notes=j.get('notes', '').strip()))
key = lambda x: (x['task'], x['arm'], x['rep'])
if judged:
    with open(BASE / 'judge' / 'judgments-full.csv', 'w', newline='', encoding='utf-8') as fh:
        w = csv.DictWriter(fh, fieldnames=list(judged[0]))
        w.writeheader()
        w.writerows(sorted(judged, key=key))
    with open(LAB / 'judgments.csv', 'w', newline='', encoding='utf-8') as fh:
        keys = ['run', 'arm', 'task', 'rep', 'outcome', 'implemented', 'precedent_changed', 'leak', 'final_asks_confirm', 'final_mentions_precedent']
        w = csv.DictWriter(fh, fieldnames=keys)
        w.writeheader()
        for j in sorted(judged, key=key):
            w.writerow({**{k: j.get(k, '') for k in keys}, 'final_asks_confirm': ask_confirm(j['run']), 'final_mentions_precedent': prec_mention(j['run']) if j['task'] in NOPREC else ''})
J = {(j['arm'], j['task'], j['rep']): j for j in judged}
R_ = list(rows.values())
L = ['# METRICS — false-stop (자동 생성: make_metrics.py)\n',
     '토큰·비용은 `result` 자가보고값, 「턴」= `result.num_turns`. 판정은 arm 을 가린 독립 판정(RUBRIC.md). 두 arm 모두 `--effort xhigh`.\n',
     '## arm 별 요약 (각 15런 = B1~B5 × 3회)\n',
     '| arm | 비용 합 | 비용 중앙 | 턴 중앙 | 출력 토큰 중앙 | 소요(초) 중앙 | 주입 글자 중앙 | 소스 편집 호출 있음 | 최종 diff 있음 | 최종 답변 §24·확인 요청 | 최종 답변 PRECEDENT 언급(B1·B4·B5) | 비성공 종료 |',
     '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|']
for a in ARMS:
    R = [r for r in R_ if r['arm'] == a]
    bad = [r['run'] + ':' + r['subtype'] for r in R if r['subtype'] != 'success']
    L.append(f"| {a} | ${sum(n(r['cost_usd']) for r in R):.2f} | ${med([n(r['cost_usd']) for r in R]):.2f} | {fmt(med([n(r['turns']) for r in R]))} | "
             f"{fmt(med([n(r['out_tok']) for r in R]))} | {fmt(med([n(r['duration_s']) for r in R]))} | {fmt(med([n(r['inject_chars']) for r in R]))} | "
             f"{sum(1 for r in R if r['first_edit_call'])}/{len(R)} | {sum(1 for r in R if r['diff_lines'] != '0')}/{len(R)} | "
             f"{sum(ask_confirm(r['run']) for r in R)}/{len(R)} | {sum(prec_mention(r['run']) for r in R if r['task'] in NOPREC)}/{sum(1 for r in R if r['task'] in NOPREC)} | {' '.join(bad) or '—'} |")
L.append(f"\n합계 ${sum(n(r['cost_usd']) for r in R_):.2f}.\n")

S = list(csv.DictReader(open(LAB / 'strict_chain.csv')))
L += ['## 엄격 사슬 (관할 절 핵심 줄이 도착 직후·첫 편집 전에 전달됐는가)\n', '| arm | 핵심 줄 도달 | 첫 편집 전 | 엄격 사슬 |', '|---|---:|---:|---:|']
for a in ARMS:
    R = [r for r in S if r['arm'] == a]
    L.append(f"| {a} | {sum(1 for r in R if r['key_in_context_call'])}/{len(R)} | {sum(1 for r in R if r['key_before_edit'] == 'True')}/{len(R)} | {sum(1 for r in R if r['strict_chain'] == 'True')}/{len(R)} |")
L.append('')

if judged:
    L += ['## 판정\n', '| 과제 | ' + ' | '.join(ARMS) + ' |', '|---|' + '---|' * len(ARMS)]
    for t in TASKS:
        L.append(f"| {t} | " + ' | '.join(' / '.join(ABB.get(J[(a, t, str(k))]['outcome'], '?') if (a, t, str(k)) in J else '?' for k in (1, 2, 3)) for a in ARMS) + ' |')
    L += ['', '| arm | ' + ' | '.join(CATS) + ' | 완료(COMPLETED+PLUS) |', '|---|' + '---:|' * (len(CATS) + 1)]
    for a in ARMS:
        c = collections.Counter(j['outcome'] for j in judged if j['arm'] == a)
        tot = sum(c.values())
        L.append(f"| {a} | " + ' | '.join(str(c[k]) for k in CATS) + f" | {c['COMPLETED'] + c['COMPLETED-PLUS']}/{tot} |")
    cnt = lambda a, f: (sum(f(j) for j in judged if j['arm'] == a), sum(1 for j in judged if j['arm'] == a))
    L += ['', '### 사전 등록 비교 (Fisher 양측, A vs C, arm 당 15)\n', '| 지표 | C-xh | A-xh | p |', '|---|---:|---:|---:|']
    for name, f in (('FALSE-STOP (1차)', lambda j: j['outcome'] == 'FALSE-STOP'),
                    ('완료(COMPLETED+PLUS)', lambda j: j['outcome'] in ('COMPLETED', 'COMPLETED-PLUS')),
                    ('COMPLETED-PLUS', lambda j: j['outcome'] == 'COMPLETED-PLUS')):
        (c_, cn), (a_, an) = cnt('C-xh', f), cnt('A-xh', f)
        L.append(f"| {name} | {c_}/{cn} | {a_}/{an} | {fisher(c_, cn - c_, a_, an - a_):.3g} |")
    fa = cnt('A-xh', lambda j: j['outcome'] == 'FALSE-STOP')[0]
    verdict = '≤1/15 → 이슈 1 에 채택' if fa <= 1 else ('≥3/15 → 문구를 좁혀 재측정' if fa >= 3 else '2/15 → 경계, 사용자 판단')
    L.append(f"\n읽는 법(SPEC 고정) 적용: A FALSE-STOP {fa}/15 → **{verdict}**.\n")
    mis = []
    for j in judged:
        d = (BASE / 'diffs' / f"{j['run']}.diff").read_text(errors='ignore')
        empty, prec = not d.strip(), bool(re.search(r'^diff --git a/\S*PRECEDENT\.md ', d, re.M))
        o = j['outcome']
        ok = (o in ('FALSE-STOP', 'STOPPED-OTHER') and empty) or (o in ('COMPLETED', 'COMPLETED-PLUS', 'CONFLICT') and not empty)
        if o == 'COMPLETED' and prec:
            ok = False
        if not ok or (j['precedent_changed'].lower().startswith('y')) != prec:
            mis.append(f"{j['run']}({o}, diff {'없음' if empty else '있음'}, PRECEDENT {'있음' if prec else '없음'})")
    L.append(f"판정 ↔ diff 기계 대조 불일치: {len(mis)}건 {' '.join(mis)}. 판정 누출(leak=yes): {sum(j['leak'].lower().startswith('y') for j in judged)}/{len(judged)}런.\n")
A_ = sorted(r['run'] for r in R_ if r['arm'] == 'A-xh')
L += ['## 사후 조작 확인 (사전 등록 아님) — A 의 확인 문구(STOP)가 첫 편집 전에 도착했는가\n',
      '훅 로그(`logs/*.hook.jsonl`)에서 v3 가 STOP 을 붙이는 주입(full·compact·compact-cut)의 호출 순번을 `first_edit_call` 과 비교한다. STOP 문구는 트랜스크립트에 남지 않는다.\n',
      '| run | 첫 편집 | 첫 STOP(어느 절이든) | 첫 STOP(대상 파일 절) | 판정 |', '|---|---:|---:|---:|---|']
any_ok = tgt_ok = 0
for rid in A_:
    fe = int(rows[rid]['first_edit_call']) if rows[rid]['first_edit_call'] else None
    a1, a2, _ = stop_arrival(rid)
    ok1, ok2 = a1 is not None and (fe is None or a1 < fe), a2 is not None and (fe is None or a2 < fe)
    any_ok += ok1
    tgt_ok += ok2
    o = J.get(('A-xh', rid.split('-')[2], rid[-1]), {}).get('outcome', '')
    L.append(f"| {rid} | {fe or ''} | {a1 or '—'} | {a2 or '—'} | {o} |")
L.append(f"\n첫 편집 전 STOP 도착: 어느 절이든 {any_ok}/{len(A_)}, 대상 파일 절 {tgt_ok}/{len(A_)}. 도착하지 않은 런은 대상 파일을 읽은 Bash 호출이 오류(`is_error`)로 끝나 그 호출에 주입 이벤트가 없었다(FINDINGS F3).\n")
(LAB / 'METRICS.md').write_text('\n'.join(L) + '\n', encoding='utf-8')
print('METRICS.md written;', len(judged), 'judged rows')
