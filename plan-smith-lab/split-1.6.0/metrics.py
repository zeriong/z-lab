#!/usr/bin/env python3
"""Generate METRICS.md from runs/ (never edit METRICS.md by hand).  Usage: python3 metrics.py > METRICS.md
Cost, turns and duration are CLI self-reports (result event); wall is measured by the runner."""
import json
import os
import re
import statistics

HERE = os.path.dirname(os.path.abspath(__file__))
RUNS = os.path.join(HERE, "runs")
TARGET = 10_000


def read(p):
    try:
        return open(p, encoding="utf-8").read()
    except OSError:
        return ""


def result(path):
    for line in read(path).splitlines():
        d = json.loads(line)
        if d.get("type") == "result":
            return d
    return {}


rows, agg = [], {}
for rid in sorted(os.listdir(RUNS)) if os.path.isdir(RUNS) else []:
    base = os.path.join(RUNS, rid)
    if not os.path.isdir(base):
        continue
    for rep in sorted(os.listdir(base)):
        d = os.path.join(base, rep)
        if not os.path.isfile(os.path.join(d, "DONE")):
            continue
        attempts = sorted(int(m.group(1)) for f in os.listdir(d) if (m := re.match(r"attempt(\d)\.check\.exit$", f)))
        verdicts = [read(os.path.join(d, f"attempt{a}.check.exit")).strip() == "0" for a in attempts]
        usd = sum(result(os.path.join(d, f"attempt{a}.stream.jsonl")).get("total_cost_usd") or 0 for a in attempts)
        turns = sum(result(os.path.join(d, f"attempt{a}.stream.jsonl")).get("num_turns") or 0 for a in attempts)
        wall = sum(int(read(os.path.join(d, f"attempt{a}.wall_ms")).strip() or 0) for a in attempts)
        out = os.path.join(d, "output")
        index = read(os.path.join(out, "plan.md"))
        listed = re.findall(r"\]\(parts/([^)\s]+)\)", index)
        sizes = [len(read(os.path.join(out, "parts", n))) for n in listed]
        unsplit = len(read(os.path.join(out, "plan.unsplit.md")))
        first_fail = next((read(os.path.join(d, f"attempt{a}.check.txt")).strip().splitlines()[0] for a, v in zip(attempts, verdicts) if not v), "—")
        r = {"pass": verdicts[-1] if verdicts else False, "attempts": len(attempts), "parts": len(listed), "usd": usd, "wall": wall,
             "max": max(sizes) if sizes else 0, "over": sum(s > TARGET for s in sizes)}
        agg.setdefault(rid, []).append(r)
        rows.append(f"| {rid} | {rep} | {unsplit:,} | {' → '.join('pass' if v else 'FAIL' for v in verdicts)} | {len(listed)} | "
                    f"{', '.join(n[:-3] for n in listed)} | {max(sizes) if sizes else 0:,} | {r['over']} | "
                    f"{'yes' if 'holds no implementation' in index else 'no'} | {turns} | {usd:.2f} | {wall:,} | {first_fail[:70]} |")

print("# split-1.6.0 지표\n")
print("`python3 metrics.py > METRICS.md` 로 생성한다. 비용·턴은 CLI 자가보고(시도 합계), wall은 러너가 잰 ms(시도 합계). 문자 수는 Python `len`(=`wc -m`).\n")
print("| 입력 | run | unsplit 문자 | 검사(시도별) | 파트 수 | 파트 | 최대 파트 문자 | 10,000자 초과 파트 | 인덱스 경고문 | turns | usd | wall | 첫 실패 사유 |")
print("|---|---|---|---|---|---|---|---|---|---|---|---|---|")
print("\n".join(rows) + "\n")
print("## 요약\n")
allr = [r for rs in agg.values() for r in rs]
if allr:
    print(f"- 최종 통과 {sum(r['pass'] for r in allr)}/{len(allr)}, 첫 시도 통과 {sum(r['pass'] and r['attempts'] == 1 for r in allr)}/{len(allr)}")
    print(f"- 파트 수 범위 {min(r['parts'] for r in allr)}–{max(r['parts'] for r in allr)}, 10,000자 초과 파트 합계 {sum(r['over'] for r in allr)}")
    print(f"- run당 비용 중앙값 ${statistics.median(r['usd'] for r in allr):.2f} (합계 ${sum(r['usd'] for r in allr):.2f}), 벽시계 중앙값 {statistics.median(r['wall'] for r in allr) / 1000:.0f}초")
