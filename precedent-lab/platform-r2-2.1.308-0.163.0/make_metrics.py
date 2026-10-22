#!/usr/bin/env python3
"""Generate METRICS.md from runs-public/*/summary.json (written after the fact; z-lab Article 3)."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent


def main():
    rows, cost = [], 0.0
    for f in sorted(HERE.glob("runs-public/*/summary.json")):
        s = json.loads(f.read_text())
        cost += s.get("cost_usd") or 0
        hits = "; ".join(k + ": " + ", ".join(sorted(set(v))) for k, v in s["records"].items() if v) or "없음"
        cli = s["cli"].split()[0] if s["host"] == "claude" else s["cli"].split()[-1]
        c = s.get("cost_usd")
        rows.append(f"| {s['case']} | {s['host']} | {cli} | {s.get('model')} | {s.get('rc')} | {s.get('seconds')} | "
                    f"{'—' if c is None else round(c, 4)} | {hits} |")
    out = ["# METRICS — platform r2 (생성: make_metrics.py, 사후 작성)", "",
           "토큰 출현 기록은 모델에게 보이는 레코드의 유형이다. Claude 는 transcript 의 `type/attachment.type`, Codex 는 rollout 의 `response_item` 이다. 원지표는 각 `summary.json` 에 있다.", "",
           "| 케이스 | 호스트 | CLI | 모델 | rc | 초 | 비용 USD | 토큰 출현 기록 |", "|---|---|---|---|---:|---:|---:|---|", *rows, "",
           f"- Claude 자가보고 비용 합: ${cost:.4f}",
           "- Codex 4케이스(x*)는 사용량 한도로 rc=1 실행 오류다. 결과가 아니다(`RUNLOG.md`, 결정 D5)."]
    (HERE / "METRICS.md").write_text("\n".join(out) + "\n")
    print("\n".join(out))


if __name__ == "__main__":
    main()
