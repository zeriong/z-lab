#!/usr/bin/env python3
"""Generate METRICS.md for E5 from runs/*/summary.json."""
import json
import math
import statistics
from pathlib import Path

HERE = Path(__file__).resolve().parent
BREAK = {"VIOLATED", "RECORDED-INVALID"}


def fisher(a, n1, b, n2):
    k, n = a + b, n1 + n2
    pr = lambda x: math.comb(n1, x) * math.comb(n2, k - x) / math.comb(n, k)
    obs = pr(a)
    return sum(pr(x) for x in range(max(0, k - n2), min(k, n1) + 1) if pr(x) <= obs + 1e-12)


def main():
    runs = [json.loads(p.read_text()) for p in sorted(HERE.glob("runs/*/summary.json"))]
    by = lambda arm, kind: [r for r in runs if r["arm"] == arm and r["kind"] == kind]
    L = ["# METRICS — fresh project (E5), 생성: make_metrics.py", "",
         "| arm | P 금지 깸 | P: VIOLATED / RECORDED-INVALID / DECLINED / CHANGED-OTHER | B 오정지 | B: COMPLETED / CHANGED-OTHER / CONFLICT | 첫 응답 입력 토큰 중앙 | 비용 중앙(P) | 턴 중앙(P) | 훅 출력 합 |",
         "|---|---:|---|---:|---|---:|---:|---:|---:|"]
    res = {}
    for arm in ("R", "N"):
        p, b = by(arm, "trap"), by(arm, "benign")
        c = lambda rs, v: sum(r["verdict"] == v for r in rs)
        res[arm] = (sum(r["verdict"] in BREAK for r in p), len(p))
        med = lambda rs, k: statistics.median([r[k] for r in rs if r.get(k) is not None]) if rs else 0
        L.append(f"| {arm} | {res[arm][0]}/{len(p)} | {c(p,'VIOLATED')} / {c(p,'RECORDED-INVALID')} / {c(p,'DECLINED')} / "
                 f"{c(p,'CHANGED-OTHER')} | {c(b,'STOPPED')}/{len(b)} | {c(b,'COMPLETED')} / {c(b,'CHANGED-OTHER')} / "
                 f"{c(b,'CONFLICT')} | {med(runs and [r for r in runs if r['arm']==arm], 'first_turn_input')} | "
                 f"{med(p,'cost_usd'):.3f} | {med(p,'num_turns')} | {sum(r['hook_events'] for r in runs if r['arm']==arm)} |")
    if all(res[a][1] for a in res):
        L.append(f"\nFisher 양측 p (P 금지 깸, R vs N) = {fisher(res['R'][0], res['R'][1], res['N'][0], res['N'][1]):.2g}")
    L += ["", "## 전체", ""]
    for arm in ("R", "N"):
        rs = [r for r in runs if r["arm"] == arm]
        L.append(f"- {arm}: {len(rs)}런, 비용 합 ${sum(r['cost_usd'] or 0 for r in rs):.2f}, 비성공 {sum(r['subtype'] != 'success' for r in rs)}, "
                 f"rc≠0 {sum(r['rc'] != 0 for r in rs)}, CLI {sorted({r['cli'] for r in rs})}")
    L += ["", "## 런별", "", "| 런 | 판정 | 결정 고쳐 씀 | 첫 응답 입력 | 턴 | 비용 |", "|---|---|---|---:|---:|---:|"]
    for r in sorted(runs, key=lambda r: (r["task"], r["arm"], r["rep"])):
        L.append(f"| {r['run']} | {r['verdict']} | {r['decision_changed']} | {r['first_turn_input']} | {r['num_turns']} | {r['cost_usd'] or 0:.3f} |")
    (HERE / "METRICS.md").write_text("\n".join(L) + "\n")
    print("\n".join(L[:12]))


if __name__ == "__main__":
    main()
