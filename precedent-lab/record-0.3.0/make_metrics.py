#!/usr/bin/env python3
"""Generate METRICS.md for E8 from runs/*/summary.json and deterministic.json (SPEC 「읽는 법」)."""
import collections
import json
from math import comb
from pathlib import Path

HERE = Path(__file__).resolve().parent
ARMS = ["none", "v020", "v030"]


def fisher(a, n1, b, n2):
    k, n = a + b, n1 + n2
    p0 = comb(n1, a) * comb(n2, b) / comb(n, k)
    return sum(comb(n1, x) * comb(n2, k - x) / comb(n, k) for x in range(max(0, k - n2), min(k, n1) + 1)
               if comb(n1, x) * comb(n2, k - x) / comb(n, k) <= p0 + 1e-12)


def med(xs):
    xs = sorted(x for x in xs if x is not None)
    return xs[len(xs) // 2] if xs else None


def main():
    runs = [json.loads(f.read_text()) for f in sorted((HERE / "runs").glob("*/summary.json"))]
    by = collections.defaultdict(list)
    for r in runs:
        by[(r["arm"], r["kind"])].append(r)
    L = ["# METRICS — record (E8)", "", f"W 런 {len(runs)}개. 원자료 `runs-public/*/summary.json`, 생성 `make_metrics.py`.", "",
         f"- 실행 환경(init): {dict(collections.Counter(r.get('version') for r in runs))}",
         f"- 실행 오류(rc≠0): {sum(1 for r in runs if r['rc'] != 0)} · 판정기 오류: "
         f"{sum(1 for r in runs if r['verdict'] == 'CHECK-ERROR')}", ""]

    det = json.loads((HERE / "deterministic.json").read_text()) if (HERE / "deterministic.json").exists() else {}
    L += ["## D — 결정론", ""]
    for name in ("v030", "v020"):
        d = det.get(name)
        if d:
            t = d.get("targets", {})
            L.append(f"- {name}: 관할 파일 {d['governed_files']} · 결정 빠진 파일 {d['files_missing_slugs']} · 모드 회귀 "
                     f"{d['mode_regressions']} · 결정 수 회사 훅 {d['old_slugs']} → {d['new_slugs']} · 최악 {d['worst_new_chars']}자 · "
                     f"E7 대상 금지줄·slug·문구 {sum(all((v.get('forbid_line'), v.get('slug'), v.get('paragraph'))) for v in t.values())}/{len(t)}")
    d = det.get("v030", {})
    d_ok = (d.get("files_missing_slugs") == 0 and d.get("mode_regressions") == 0 and d.get("worst_new_chars", 10 ** 6) < 10000
            and d.get("targets") and all(all((v.get("forbid_line"), v.get("slug"), v.get("paragraph"))) for v in d["targets"].values()))
    L += [f"- 조건 1(D): {'충족' if d_ok else '미충족'}", ""]

    res = {}
    L += ["## W — 기록 행동", "", "| arm | N 기록 (절 있음) | U 기록 (기록 없음) | Q 완료 | Q 과잉 기록 |", "|---|---:|---:|---:|---:|"]
    for arm in ARMS:
        N, U, Q = by[(arm, "new")], by[(arm, "unrecorded")], by[(arm, "quiet")]
        nr = sum(r["verdict"] == "NEW-RECORDED" for r in N)
        ur = sum(r["verdict"] == "NEW-RECORDED" for r in U)
        qc = sum(r["verdict"] == "COMPLETED" for r in Q)
        qo = sum(r["over_record"] for r in Q)
        res[arm] = dict(nr=nr, nN=len(N), ur=ur, nU=len(U), qc=qc, nQ=len(Q), qo=qo)
        L.append(f"| {arm} | {nr}/{len(N)} | {ur}/{len(U)} | {qc}/{len(Q)} | {qo}/{len(Q)} |")
    L += ["", "판정 분포:", "", "| arm | 종류 | 판정 |", "|---|---|---|"]
    for arm in ARMS:
        for kind in ("new", "unrecorded", "quiet"):
            if by[(arm, kind)]:
                L.append(f"| {arm} | {kind} | {dict(collections.Counter(r['verdict'] for r in by[(arm, kind)]))} |")
    v3, v2, n0 = res.get("v030", {}), res.get("v020", {}), res.get("none", {})
    c2 = v3.get("ur", 0) >= 6 and v3.get("ur", 0) - v2.get("ur", 0) >= 3 and v3.get("ur", 0) - n0.get("ur", 0) >= 3
    c3 = v3.get("qo", 99) <= 1
    c4 = v3.get("nr", 0) >= v2.get("nr", 0) - 1
    U3 = by[("v030", "unrecorded")]
    deliv = sum(1 for r in U3 if (r.get("hooks") or {}).get("no_record_line"))
    L += ["", "## 읽는 법 (SPEC)", "",
          f"- 조건 2(쓰기 안내 작동): v030 U {v3.get('ur')}/{v3.get('nU')} · v020 {v2.get('ur')} · none {n0.get('ur')} → {'충족' if c2 else '미충족'}",
          f"- 조건 3(과잉 기록): v030 Q {v3.get('qo')}/{v3.get('nQ')} → {'충족' if c3 else '미충족'}",
          f"- 조건 4(N 회귀 없음): v030 N {v3.get('nr')} vs v020 {v2.get('nr')} → {'충족' if c4 else '미충족'}",
          f"- 전달(참고): v030 U 런 중 기록 없음 안내 도착 {deliv}/{len(U3)}",
          f"- #5 읽기: none U {n0.get('ur')}/{n0.get('nU')} · N {n0.get('nr')}/{n0.get('nN')}"
          + (" → 이 fixture 에서는 훅 없이도 기록한다" if n0.get("ur", 0) >= 6 else ""),
          f"- 종합: {'0.3.0 릴리즈 조건 충족' if (d_ok and c2 and c3 and c4) else '미충족 경로 분류 필요'}"]
    if v3 and n0:
        L += [f"- 참고 Fisher 양측 p — U 기록 v030 vs none: {fisher(v3['ur'], v3['nU'], n0['ur'], n0['nU']):.2g} · "
              f"v030 vs v020: {fisher(v3['ur'], v3['nU'], v2['ur'], v2['nU']):.2g}"]
    L += ["", "## 기록 위치·형태 (U · NEW-RECORDED)", "", "| arm | 대상과 같은 디렉터리 | 한정어 없는 결정 줄 |", "|---|---:|---:|"]
    for arm in ARMS:
        rec = [r for r in by[(arm, "unrecorded")] if r["verdict"] == "NEW-RECORDED"]
        L.append(f"| {arm} | {sum(r['check']['record_at_target_dir'] for r in rec)}/{len(rec)} | "
                 f"{sum(r['check']['decision_exact'] for r in rec)}/{len(rec)} |")
    L += ["", "## 비용·턴 (자가보고)", "", "| arm | 종류 | 비용 합 | 비용 중앙 | 턴 중앙 |", "|---|---|---:|---:|---:|"]
    for arm in ARMS:
        for kind in ("new", "unrecorded", "quiet"):
            rs = by[(arm, kind)]
            if rs:
                cs = [r.get("cost_usd") for r in rs if r.get("cost_usd") is not None]
                L.append(f"| {arm} | {kind} | ${sum(cs):.2f} | ${med(cs) or 0:.3f} | {med([r.get('num_turns') for r in rs])} |")
    L.append(f"\n- 합계: ${sum(r.get('cost_usd') or 0 for r in runs):.2f}\n")
    L += ["## 런별", "", "| run | 판정 | 기록 디렉터리 | 새 블록 | 결정 줄(정확) | 훅 메시지(기록없음·Edit알림·절없음·문구) |",
          "|---|---|---|---:|---|---|"]
    for r in sorted(runs, key=lambda r: (r["arm"], r["task"], r["rep"])):
        c, h = r["check"], r.get("hooks") or {}
        L.append(f"| {r['run']} | {r['verdict']} | {c.get('governing_record_dir')} | {c.get('new_blocks')} | "
                 f"{c.get('decision_exact')} | {h.get('no_record_line')}·{h.get('edit_reminder')}·{h.get('no_section_line')}·{h.get('paragraph')} |")
    (HERE / "METRICS.md").write_text("\n".join(L) + "\n")
    print("\n".join(L[:40]))


if __name__ == "__main__":
    main()
