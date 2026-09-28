#!/usr/bin/env python3
"""Generate METRICS.md from runs/ (+ read-only comparison with X12 and R12).  Usage: python3 metrics.py > METRICS.md"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__)); LAB = os.path.dirname(HERE)
def row(label, p, wall_p):
    d = json.load(open(p)); u = d.get("usage") or {}; so = d.get("structured_output")
    return (f"| {label} | {'yes' if isinstance(so, dict) and 'verdict' in so else 'no'} | {(so or {}).get('verdict')} | {u.get('cache_creation_input_tokens', 0):,} | "
            f"{u.get('cache_read_input_tokens', 0):,} | {d.get('num_turns')} | {d.get('total_cost_usd'):.4f} | {open(wall_p).read().strip()} |")
print("# recheck-0.1.0-rev3 지표\n\n`python3 metrics.py > METRICS.md` 로 생성. 비교 행은 형제 실험을 읽기만 한다. 토큰·비용·턴은 CLI 자가보고, wall 은 러너 측정 ms.\n")
print("## C12 Claude 리뷰어(opus) — 같은 스모크 phase\n\n| 형태 | 구조화 출력 | verdict | cache_creation | cache_read | turns | usd | wall |\n|---|---|---|---|---|---|---|---|")
for label, rd in (("X12 수정 전 (`--allowedTools` 만)", os.path.join(LAB, "env-probes-0.1.0/runs/X12/-/r1")),
                  ("R12 `--tools` 화이트리스트", os.path.join(LAB, "recheck-0.1.0-rev2/runs/R12/-/r1")),
                  ("C12 최종 (`--disallowedTools` 거부 목록)", os.path.join(HERE, "runs/C12/-/r1"))):
    print(row(label, os.path.join(rd, "claude-reviewer.result.json"), os.path.join(rd, "claude-reviewer.wall_ms")))
same = open(os.path.join(HERE, "runs/C12/-/r1/phase-matches-R12.txt")).read().strip()
print(f"\nC12의 phase diff는 R12와 {'같다' if same == 'same' else '다르다'} (`phase-matches-R12.txt`).\n")
log = open(os.path.join(HERE, "runs/S01/-/r1/suite.log")).read().strip().splitlines()
print(f"## S01\n\n- `{log[-1]}`")
