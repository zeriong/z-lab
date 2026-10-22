#!/usr/bin/env python3
"""Deterministic counts for SPEC.md. Prints METRICS.md; writes nothing but counts.

usage: python3 analyze.py --projects <~/.claude/projects> --key <repo project-dir key> --repo <repo path>
                          --exclude-session <id> --since <ISO Z> [--until <ISO Z>] > METRICS.md
Paths, keys and session ids come in as arguments so that no private identifier is stored here.
"""
import argparse
import collections
import datetime as dt
import json
import re
import statistics
import subprocess
from pathlib import Path

STOP_MARK = "⚠ 이 절의 결정·금지는"
EDIT_TOOLS = {"Edit", "Write", "MultiEdit"}
COMMIT_RE = re.compile(r"(^|[\s;&|(])git(\s+-[Cc]\s+\S+)*\s+commit(\s|$)")
TOKEN_RE = re.compile(r"(^|\s)PRECEDENT_OK=1(\s|$)")
SOURCE_RE = re.compile(r"^(apps|packages|\.claude|scripts|tooling)/.*\.(ts|tsx|css|mjs|sh)$")
SKIP_RE = re.compile(r"(^|/)(node_modules|history|graphify-out)/")


def kind(text):
    if text.startswith("PRECEDENT 주입(압축"):
        return "compressed"
    if text.startswith("PRECEDENT 주입"):
        return "full"
    if text.startswith("PRECEDENT:") and "절 없음" in text:
        return "noline"
    if text.startswith("PRECEDENT 관할"):
        return "edit-reminder"
    if "적용 대상 — Read 로 로드" in text:
        return "rules-hint"
    return None


def unquote(cmd):
    return re.sub(r"'[^']*'", " ", re.sub(r'"(?:\\.|[^"\\])*"', " ", cmd))


def result_text(content):
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(c.get("text", "") for c in content if isinstance(c, dict))
    return ""


def transcripts(projects, key, exclude):
    for d in sorted(projects.iterdir()):
        if not (d.name == key or d.name.startswith(key + "--claude-worktrees-")):
            continue
        for f in sorted(d.rglob("*.jsonl")):
            if exclude in f.parts or f.stem == exclude:
                continue
            yield f


def load(f):
    rows = []
    for line in f.read_text(errors="replace").splitlines():
        try:
            rows.append(json.loads(line))
        except ValueError:
            continue
    return rows


def first_ts(rows):
    return next((r["timestamp"] for r in rows if r.get("timestamp")), None)


def analyze_transcripts(args):
    A = collections.Counter()
    versions, entries = collections.Counter(), collections.Counter()
    B = collections.Counter()
    B_chars, B_files = [], 0
    C = collections.Counter()
    D = collections.Counter()
    for f in transcripts(Path(args.projects), args.key, args.exclude_session):
        rows = load(f)
        ts = first_ts(rows)
        if not ts or ts < args.since or ts > args.until:
            continue
        sub = "subagents" in f.parts
        A["subagent" if sub else "top-level"] += 1
        versions[next((r["version"] for r in rows if r.get("version")), None)] += 1
        entries[next((r["entrypoint"] for r in rows if r.get("entrypoint")), None)] += 1
        uses, results, order = {}, {}, []
        for i, r in enumerate(rows):
            msg = r.get("message") or {}
            if r.get("type") == "assistant":
                for c in msg.get("content") or []:
                    if c.get("type") == "tool_use":
                        uses[c["id"]] = (i, c.get("name"), c.get("input") or {})
                        order.append((i, "use", c))
                    elif c.get("type") == "text":
                        order.append((i, "text", c.get("text", "")))
            elif r.get("type") == "user" and isinstance(msg.get("content"), list):
                for c in msg["content"]:
                    if isinstance(c, dict) and c.get("type") == "tool_result":
                        results[c.get("tool_use_id")] = c
        injected = False
        for i, r in enumerate(rows):
            att = r.get("attachment") or {}
            if att.get("type") != "hook_additional_context" or att.get("hookEvent") not in ("PostToolUse",
                                                                                           "PostToolUseFailure"):
                continue
            text = "".join(att.get("content") or [])
            k = kind(text)
            if not k:
                continue
            injected = True
            B[k] += 1
            B[f"event:{att.get('hookEvent')}"] += 1
            if k in ("full", "compressed"):
                B_chars.append(len(text))
            if "persisted-output" in json.dumps(r.get("rendered"), ensure_ascii=False):
                B["persisted"] += 1
            if STOP_MARK not in text:
                continue
            B["stop"] += 1
            use = uses.get(att.get("toolUseID"))
            tool = use[1] if use else None
            C[f"trigger:{tool}"] += 1
            target = (use[2].get("file_path") if use and tool in EDIT_TOOLS | {"Read"} else None)
            later = [o for o in order if o[0] > i]
            if target:
                C["with-target"] += 1
                if any(o[1] == "use" and o[2].get("name") in EDIT_TOOLS and
                       (o[2].get("input") or {}).get("file_path") == target for o in later):
                    C["C1-target-edited-after"] += 1
            if any(o[1] == "use" and o[2].get("name") in EDIT_TOOLS and
                   str((o[2].get("input") or {}).get("file_path", "")).endswith("PRECEDENT.md") for o in later):
                C["C2-precedent-edited-after"] += 1
            if any((o[1] == "use" and o[2].get("name") == "AskUserQuestion") or
                   (o[1] == "text" and "무효화 사유" in o[2]) for o in later):
                C["C3-ask-candidate-after"] += 1
        B_files += injected
        denied_prec = False
        for i, kind_, c in order:
            if kind_ != "use" or c.get("name") != "Bash":
                continue
            cmd = unquote(str((c.get("input") or {}).get("command", "")))
            if not COMMIT_RE.search(cmd) or "--help" in cmd:
                continue
            D["commit-commands"] += 1
            has = bool(TOKEN_RE.search(cmd))
            D["with-PRECEDENT_OK"] += has
            if denied_prec:
                D["after-precedent-denial:next-has-token"] += has
                D["after-precedent-denial:next-commits"] += 1
                denied_prec = False
            res = results.get(c.get("id")) or {}
            body = result_text(res.get("content"))
            if res.get("is_error") and "필요 토큰:" in body:
                D["denied"] += 1
                line = next((l for l in body.splitlines() if "필요 토큰:" in l), "")
                if "PRECEDENT_OK" in line:
                    D["denied-needing-PRECEDENT_OK"] += 1
                    denied_prec = True
    return A, versions, entries, B, B_chars, B_files, C, D


def git_windows(args):
    since = dt.datetime.fromisoformat(args.since.replace("Z", "+00:00"))
    until = dt.datetime.fromisoformat(args.until.replace("Z", "+00:00"))
    pre = since - (until - since)
    out = subprocess.run(["git", "-C", args.repo, "log", "dev", "--no-merges", "--format=@@%aI", "--name-only",
                          f"--since={(pre - dt.timedelta(days=3)).isoformat()}"],
                         capture_output=True, text=True, check=True).stdout
    commits, cur = [], None
    for line in out.splitlines():
        if line.startswith("@@"):
            cur = [dt.datetime.fromisoformat(line[2:]), []]
            commits.append(cur)
        elif line.strip() and cur:
            cur[1].append(line.strip())
    res = {}
    for name, lo, hi in (("pre", pre, since), ("post", since, until)):
        touched = collections.Counter()
        n_src = n_prec = 0
        for when, files in commits:
            if not (lo <= when < hi):
                continue
            src = [p for p in files if SOURCE_RE.match(p) and not SKIP_RE.search(p)]
            if not src:
                continue
            n_src += 1
            n_prec += any(p.endswith("PRECEDENT.md") for p in files)
            touched.update(set(src))
        three = sum(1 for n in touched.values() if n >= 3)
        res[name] = {"from": lo.date().isoformat(), "to": hi.date().isoformat(), "source_commits": n_src,
                     "with_precedent": n_prec, "files": len(touched), "files_3plus": three,
                     "rate": f"{100 * three / len(touched):.1f}%" if touched else "—"}
    return res


def main():
    p = argparse.ArgumentParser()
    for a in ("--projects", "--key", "--repo", "--exclude-session", "--since"):
        p.add_argument(a, required=True)
    p.add_argument("--until", default=dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
    args = p.parse_args()
    A, versions, entries, B, chars, files, C, D = analyze_transcripts(args)
    G = git_windows(args)
    med = statistics.median(chars) if chars else 0
    lines = [
        "# METRICS — real-use (생성: analyze.py)", "",
        f"기간: {args.since} ~ {args.until} (transcript 첫 레코드 시각 기준). 분석 세션과 그 서브에이전트는 제외.", "",
        "## A. 모집단", "",
        f"- transcript: 최상위 {A['top-level']} · 서브에이전트 {A['subagent']}",
        f"- entrypoint: {dict(entries.most_common())}",
        f"- CLI version: {dict(versions.most_common())}", "",
        "## B. 도착 주입 (PostToolUse · PostToolUseFailure)", "",
        "| 항목 | 건수 |", "|---|---:|",
        *[f"| {k} | {B[k]} |" for k in ("full", "compressed", "noline", "edit-reminder", "rules-hint", "stop",
                                       "persisted", "event:PostToolUse", "event:PostToolUseFailure")],
        f"| 주입이 1건 이상인 transcript | {files} |",
        f"| 본문·압축 주입 글자 수 중앙 / 최대 | {med:.0f} / {max(chars) if chars else 0} |", "",
        "## C. 확인 문구 뒤 (기계 지표, 판정 아님)", "",
        "| 항목 | 건수 |", "|---|---:|",
        *[f"| {k} | {v} |" for k, v in sorted(C.items())], "",
        "## D. 커밋 토큰", "",
        "| 항목 | 건수 |", "|---|---:|",
        *[f"| {k} | {D[k]} |" for k in ("commit-commands", "with-PRECEDENT_OK", "denied", "denied-needing-PRECEDENT_OK",
                                       "after-precedent-denial:next-commits",
                                       "after-precedent-denial:next-has-token")], "",
        "## E. 이력 (dev, --no-merges, author date)", "",
        "| 창 | 기간 | 소스 커밋 | PRECEDENT.md 동반 | 건드린 소스 파일 | 3회 이상 | 재수정률 |",
        "|---|---|---:|---:|---:|---:|---:|",
        *[f"| {n} | {g['from']}~{g['to']} | {g['source_commits']} | {g['with_precedent']} | {g['files']} | "
          f"{g['files_3plus']} | {g['rate']} |" for n, g in G.items()],
    ]
    print("\n".join(lines))


if __name__ == "__main__":
    main()
