#!/usr/bin/env python3
"""results.csv(round 2/3) -> METRICS.md. usage: make-metrics-round.py <lab_dir> <round_label> <out_md>"""
import csv
import pathlib
import statistics as st
import sys

LAB = pathlib.Path(sys.argv[1]); label = sys.argv[2]; out = pathlib.Path(sys.argv[3])
rows = [r for r in csv.DictReader(open(LAB / 'results.csv')) if r['rep'] in ('r1', 'r2')]
NAMES = {'A': 'A graph+hook', 'B': 'B graph+rule', 'C': 'C grep+hook', 'D': 'D graph+hook-bash'}


def fl(rs, k):
    return [float(r[k]) for r in rs if r.get(k) not in ('', None)]


def summ(rs):
    pt = [(float(r['in_tok'] or 0) + float(r['cache_read'] or 0) + float(r['cache_create'] or 0)) / max(float(r['turns'] or 1), 1) for r in rs]
    outs = {}
    for r in rs:
        outs[r['auto_outcome']] = outs.get(r['auto_outcome'], 0) + 1
    arr = fl(rs, 'arrival_call'); tok = fl(rs, 'tokens_before_arrival')
    return dict(n=len(rs), graphify=sum(1 for r in rs if int(r['graphify_calls'] or 0) > 0),
                arr=(st.median(arr) if arr else None), tok=(st.median(tok) if tok else None),
                hook=sum(1 for r in rs if r['hook_fired'] == 'True'), gov=sum(1 for r in rs if r['read_governing'] == 'True'),
                after=sum(1 for r in rs if r['read_after_arrival'] == 'True'),
                read_tool=sum(1 for r in rs if 'Read' in (r.get('tool_sequence') or '')),
                turns=(st.mean(fl(rs, 'turns')) if fl(rs, 'turns') else None), calls=st.mean(fl(rs, 'tool_calls')),
                cost=sum(fl(rs, 'cost_usd')), pt=st.mean(pt), outs=outs)


lines = [f"# METRICS — {label}", "",
         "생성: make-metrics-round.py ← results.csv (analyze_r*.py). 토큰은 Claude Code `result.usage` 자가보고값. 턴당 입력 = (input + cache_read + cache_create) ÷ num_turns.",
         "훅 발화는 세션 id 마커 디렉터리 기준. 도착 = 대상 파일에 처음 닿은 도구 호출 순번. 1차 판정은 자동(위반 시그니처·diff)이며 독립 판정은 `judgments.md`.", "",
         "## 런별 원지표", "",
         "| run | turns | calls | graphify | 도착 호출 | 도착 전 토큰 | 훅 발화 | 관할 읽음 | 도착 뒤 읽음 | Read 도구 | cost | cache_read | cache_create | diff 줄 | 1차 판정 |",
         "|---|---:|---:|---:|---:|---:|---|---|---|---|---:|---:|---:|---:|---|"]
for r in sorted(rows, key=lambda r: (r['cond'], r['task'], r['rep'])):
    lines.append(f"| {r['run']} | {r['turns']} | {r['tool_calls']} | {r['graphify_calls']} | {r['arrival_call']} | {r['tokens_before_arrival']} | {r['hook_fired']} | {r['read_governing']} | {r['read_after_arrival']} | {'Read' in (r.get('tool_sequence') or '')} | {r['cost_usd']} | {r['cache_read']} | {r['cache_create']} | {r['diff_lines']} | {r['auto_outcome']} |")
lines += ["", "## 조건별 요약", "",
          "| 조건 | 작업군 | n | graphify 쓴 런 | 도착 호출 med | 도착 전 토큰 med | 훅 발화 | 관할 읽음 | 도착 뒤 읽음 | Read 도구 쓴 런 | 평균 turns | 평균 calls | 평균 턴당 입력 | 합계 cost | 1차 판정 |",
          "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|"]
conds = sorted(set(r['cond'] for r in rows))
for c in conds:
    groups = [('전체', [r for r in rows if r['cond'] == c])]
    if any(r['task'].startswith('R') for r in rows):
        groups = [('함정 T1-T5', [r for r in rows if r['cond'] == c and r['task'].startswith('T')]),
                  ('구조 R1-R2', [r for r in rows if r['cond'] == c and r['task'].startswith('R')])]
    for g, rs in groups:
        if not rs:
            continue
        s = summ(rs)
        lines.append(f"| {NAMES.get(c, c)} | {g} | {s['n']} | {s['graphify']} | {s['arr']} | {s['tok'] and round(s['tok'])} | {s['hook']} | {s['gov']} | {s['after']} | {s['read_tool']} | {s['turns'] and round(s['turns'], 1)} | {s['calls']:.1f} | {s['pt']:.0f} | {s['cost']:.2f} | {s['outs']} |")
out.write_text('\n'.join(lines) + '\n')
print(out, len(lines), 'lines')
