#!/usr/bin/env python3
"""Generate METRICS.md from runs-public/*/summary.json."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent


def main():
    rows, total = [], 0.0
    for f in sorted(HERE.glob("runs-public/*/summary.json")):
        s = json.loads(f.read_text())
        total += s.get("cost_usd") or 0
        ran = sum(s["checks_run"].values())
        rows.append(f"| {s['run']} | {s['cli']} | {len(s['changed'])} | {ran}/{len(s['checks_run'])} | {s['named']} | "
                    f"{s['num_turns']} | {s['seconds']} | {s.get('cost_usd') or 0:.3f} |")
    out = ["# METRICS — audit canary (생성: make_metrics.py)", "",
           "`named` 는 사전 등록한 자동 문자열 지표다. 정상본에서는 부정문에 걸려 참이 되기도 했다(FINDINGS U3). 거짓 결함 판정은 사람이 읽은 값이다.", "",
           "| 런 | CLI | 변경 파일 | 검사 실행 | named(자동) | 턴 | 초 | 비용 USD |", "|---|---|---:|---:|---|---:|---:|---:|", *rows,
           "", f"- 합계 비용(자가보고): ${total:.2f}"]
    (HERE / "METRICS.md").write_text("\n".join(out) + "\n")
    print("\n".join(out))


if __name__ == "__main__":
    main()
