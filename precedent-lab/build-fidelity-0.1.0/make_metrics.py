#!/usr/bin/env python3
"""Generate METRICS.md from runs-public/**/summary.json (written after the fact; z-lab Article 3)."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent


def main():
    rows, total = [], 0.0
    for f in sorted(HERE.glob("runs-public/**/summary.json")):
        s = json.loads(f.read_text())
        sc, t1, t2 = s["score"], s["turn1"], s["turn2"] or {}
        cost = (t1.get("cost_usd") or 0) + (t2.get("cost_usd") or 0)
        total += cost
        checks = " · ".join(f"{k} {v['rc'] if v else '—'}" for k, v in sc["checks"].items())
        r = sc["resident"]
        rows.append(f"| {s['run']} | {t1.get('cli')} / {t2.get('cli')} | {sc['counts']} | {s['turn1_changes']} | {checks} | "
                    f"{r['chars_before']}→{r['chars_after']} / {r['bytes_before']}→{r['bytes_after']} | "
                    f"{t1.get('num_turns')}+{t2.get('num_turns')} | {t1.get('seconds')}+{t2.get('seconds')} | {cost:.3f} |")
    out = [f"# METRICS — {HERE.name} (생성: make_metrics.py, 사후 작성)", "",
           "검사 rc 0 은 통과다(self_test · max_output · records_lint · install_check). 원지표는 각 `summary.json` 의 `score` 에 있다.", "",
           "| 런 | CLI(1턴 / 2턴) | 항목 판정 | 1턴 종료 시 변경 | 검사 rc | 상주 글자 / 바이트 | 턴(1+2) | 초(1+2) | 비용 USD |",
           "|---|---|---|---:|---|---|---:|---:|---:|", *rows, "", f"- 합계 비용(자가보고): ${total:.2f}"]
    (HERE / "METRICS.md").write_text("\n".join(out) + "\n")
    print("\n".join(out))


if __name__ == "__main__":
    main()
