#!/usr/bin/env python3
"""results.csv (+ evidence/hook-cap/SUMMARY.txt) -> METRICS.md. 원지표와 계산식을 함께 적는다."""
import csv
import pathlib
import statistics as st

LAB = pathlib.Path('/tmp/precedent-lab')
rows = list(csv.DictReader(open(LAB / 'results.csv')))


def f(r, k):
    return float(r[k] or 0)


lines = [
    "# METRICS — arrive-then-read (PRECEDENT.md 도착 훅) 실측",
    "",
    "생성: make-metrics.py ← results.csv (analyze.py 가 runs/*.jsonl 의 `result` 이벤트와 tool_use, diffs/*.diff, 훅 마커 디렉터리에서 뽑음).",
    "토큰은 Claude Code `result.usage` 자가보고값이다(제4조). `input` 은 캐시 열을 제외한 입력, `cache_read`·`cache_create` 는 프롬프트 캐시 읽기·생성. 턴당 입력 = (input + cache_read + cache_create) ÷ num_turns.",
    "",
    "## 런별 원지표",
    "",
    "| run | model | turns | 소요 s | cost USD | input | cache_read | cache_create | output | 훅 발화(마커) | 관할 PRECEDENT 읽음 | diff 줄 | 1차 판정 |",
    "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---|",
]
for r in sorted(rows, key=lambda r: r['run']):
    lines.append(
        f"| {r['run']} | {r['model']} | {r['turns']} | {r['duration_s']} | {r['cost_usd']} | {r['in_tok']} | {r['cache_read']} | {r['cache_create']} | {r['out_tok']} | {r['hook_ctx']} | {r['read_governing']} | {r['diff_lines']} | {r['auto_outcome']} |"
    )

lines += [
    "",
    "## 조건별 요약 (스모크 런 A-T2-r0 제외, 조건당 10런)",
    "",
    "| 조건 | 런 | 평균 turns | 평균 소요 s | 합계 cost | 평균 cost | 평균 cache_create | 평균 cache_read | 평균 턴당 입력 | 훅 발화 런 | 관할 읽은 런 | 금지 그대로 구현 | 기록 갱신하며 구현 | 거부·확인 요청 |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
]
summ = {}
for c, name in (('A', 'A hook'), ('B', 'B rule'), ('C', 'C resident')):
    rs = [r for r in rows if r['cond'] == c and r['rep'] != 'r0']
    pt = [(f(r, 'in_tok') + f(r, 'cache_read') + f(r, 'cache_create')) / max(f(r, 'turns'), 1) for r in rs]

    def o(k, rs=rs):
        return sum(1 for r in rs if r['auto_outcome'].startswith(k))

    summ[c] = dict(
        n=len(rs),
        turns=st.mean([f(r, 'turns') for r in rs]),
        dur=st.mean([f(r, 'duration_s') for r in rs]),
        cost=sum(f(r, 'cost_usd') for r in rs),
        avgcost=st.mean([f(r, 'cost_usd') for r in rs]),
        cc=st.mean([f(r, 'cache_create') for r in rs]),
        cr=st.mean([f(r, 'cache_read') for r in rs]),
        pt=st.mean(pt),
        hook=sum(1 for r in rs if int(r['hook_ctx']) > 0),
        gov=sum(1 for r in rs if r['read_governing'] == 'True'),
        v=o('VIOLATED'), rec=o('RECORDED'), dec=o('DECLINED'),
    )
    s = summ[c]
    lines.append(
        f"| {name} | {s['n']} | {s['turns']:.1f} | {s['dur']:.0f} | {s['cost']:.2f} | {s['avgcost']:.3f} | {s['cc']:.0f} | {s['cr']:.0f} | {s['pt']:.0f} | {s['hook']} | {s['gov']} | {s['v']} | {s['rec']} | {s['dec']} |"
    )

a, b, c = summ['A'], summ['B'], summ['C']
lines += [
    "",
    "## 델타 (A hook 기준)",
    "",
    "| 지표 | B rule vs A | C resident vs A | 계산 |",
    "|---|---:|---:|---|",
    f"| 평균 턴당 입력 토큰 | {100 * (b['pt'] / a['pt'] - 1):+.1f}% | {100 * (c['pt'] / a['pt'] - 1):+.1f}% | 조건 평균 ÷ A 평균 − 1 |",
    f"| 평균 turns | {100 * (b['turns'] / a['turns'] - 1):+.1f}% | {100 * (c['turns'] / a['turns'] - 1):+.1f}% | 동상 |",
    f"| 평균 cost | {100 * (b['avgcost'] / a['avgcost'] - 1):+.1f}% | {100 * (c['avgcost'] / a['avgcost'] - 1):+.1f}% | 동상 |",
    f"| 평균 소요 | {100 * (b['dur'] / a['dur'] - 1):+.1f}% | {100 * (c['dur'] / a['dur'] - 1):+.1f}% | 동상 |",
    "",
    "## 훅 주입 상한 프로브 (evidence/hook-cap/)",
    "",
    "`inject-context.sh`(UserPromptSubmit) 로 critical-core.md 를 N자로 채우고 끝에 마커를 둔 뒤, `claude -p --max-turns 1` 로 마커가 보이는지 물었다. 각 행의 훅 출력 JSON 과 결과 JSON 이 파일로 있다.",
    "",
    "```",
    (LAB / 'evidence' / 'hook-cap' / 'SUMMARY.txt').read_text().strip(),
    "```",
    "",
    "additionalContext 9,996자 → 전달, 10,046자 → 통째로 누락(cache_create 가 기본 지시문만 있을 때 수준으로 떨어짐). 같은 전문을 루트 CLAUDE.md 에 붙이면 전달되고 cache_create 가 66,904 토큰이 된다.",
    "",
    "## 산술 참고",
    "",
    "- 레포의 PRECEDENT.md 88개 합계 970KB. 이번 실험에서 CLAUDE.md 상주 104KB → cache_create 약 67k 토큰(기본 약 16k 포함)이었으므로, 970KB 전부를 상주시키면 대략 47만 토큰 규모로 200k 컨텍스트에 들어가지 않는다(선형 외삽, 실측 아님).",
    "- 도착 훅의 안내는 400B 이하(훅 코드의 상한)다.",
]
(LAB / 'METRICS.md').write_text('\n'.join(lines) + '\n')
print("METRICS.md", len(lines), "lines")
