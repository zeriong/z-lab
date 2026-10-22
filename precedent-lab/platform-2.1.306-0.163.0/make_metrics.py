#!/usr/bin/env python3
"""Generate METRICS.md from runs/*/summary.json, applying SPEC's reading rule (the record check wins over SEEN)."""
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ORDER = ["cR1", "cB1", "cF1", "cD1", "cE1", "cS1", "cC1", "cC2", "cU1", "cU2",
         "xB1", "xF1", "xE1", "xC1", "xC2", "xC3", "xU1"]


def spec_verdict(v):
    if v["verdict"] == "not-fired":
        return "미발화"
    rs, re_ = v["record_start_hits"] > 0, v["record_end_hits"] > 0
    if rs and re_:
        return "전달"
    if rs:
        return "잘림"
    return "누락" if not (v["answer_start"] or v["answer_end"]) else "기록 없음·답변만"


def codex_usage(case):
    total = {}
    path = HERE / "runs" / case / "codex.jsonl"
    if not path.exists():
        return None
    for line in path.read_text().splitlines():
        try:
            ev = json.loads(line)
        except ValueError:
            continue
        if ev.get("type") == "turn.completed":
            for k, n in (ev.get("usage") or {}).items():
                if isinstance(n, int):
                    total[k] = total.get(k, 0) + n
    return total


def main():
    rows, cost, usage = [], 0.0, {}
    for case in ORDER:
        p = HERE / "runs" / case / "summary.json"
        if not p.exists():
            rows.append(f"| {case} | (없음) | | | | | | |")
            continue
        s = json.loads(p.read_text())
        cost += s.get("cost_usd") or 0
        if s["host"] == "codex":
            for k, n in (codex_usage(case) or {}).items():
                usage[k] = usage.get(k, 0) + n
        fired = ", ".join(sorted({f"{e['hook_event_name'] or e['event_arg']}:{e['tool_name']}"
                                  for e in s["probe_events"]}))
        cwd = sorted({(e["cwd"] or "").rsplit("/repo", 1)[-1] or "/" for e in s["probe_events"]})
        agents = sorted({str(e["agent_id"]) for e in s["probe_events"] if e["agent_id"]})
        version = re.search(r"\d+\.\d+\.\d+", s["cli"]).group(0)
        for v in s["verdicts"]:
            ans = ("시작" if v["answer_start"] else "") + ("·끝" if v["answer_end"] else "")
            rec = f"{v['record_start_hits']}/{v['record_end_hits']}"
            rows.append(f"| {case} | {s['host']} {version} | {v['event']} | {v['size']:,} | "
                        f"**{spec_verdict(v)}** | {ans or '없음'} | {rec} | {fired} · cwd {','.join(cwd)}"
                        f"{' · agent ' + ','.join(agents) if agents else ''} | {s.get('model')} | {s['seconds']} |")
    out = [
        "# METRICS — platform-2.1.306-0.163.0 (생성: make_metrics.py)",
        "",
        "판정 = SPEC 「읽는 법」: 기록(모델에게 보이는 렌더/대화 이력)에서 시작·끝 토큰이 모두 나오면 전달, 시작만 나오면 잘림,"
        " 없으면 누락. 답변 `SEEN:` 은 보조이며 엇갈리면 둘 다 적는다.",
        "기록 칸은 「시작 토큰 / 끝 토큰」 출현 수다. Claude 는 두 설정 루트가 같은 디렉터리를 가리켜 같은 레코드가 2회 셀 수 있다.",
        "",
        "| 케이스 | 호스트 | 출력 이벤트 | N자 | 판정 | 답변 SEEN | 기록 시작/끝 | 발화한 이벤트:도구 · cwd 꼬리 | 모델 | 초 |",
        "|---|---|---|---:|---|---|---|---|---|---:|",
        *rows,
        "",
        f"- Claude 자가보고 비용 합: ${cost:.4f}",
        f"- Codex 사용량 합(`turn.completed` usage, 자가보고): {json.dumps(usage)}",
    ]
    (HERE / "METRICS.md").write_text("\n".join(out) + "\n")
    print("\n".join(out))


if __name__ == "__main__":
    main()
