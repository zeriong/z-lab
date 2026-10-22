#!/usr/bin/env python3
"""State-aware runner for SPEC.md; reuses ../platform-2.1.306-0.163.0/run.py for fixture, hosts and record scans.

usage: python3 run.py <scratch-dir> [case ...]
"""
import importlib.util
import json
import os
import re
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("base", HERE.parent / "platform-2.1.306-0.163.0" / "run.py")
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
base.PROBE = HERE / "probe_hook.py"
RUNS = HERE / "runs"
READ = "Use the Read tool to read {}."
CASES = {
    "rN": ("claude", [], "Reply with ok."),
    "rR": ("claude", [], READ.format("src/tabs/a.ts")),
    "rB": ("claude", [], "Use the Bash tool to run exactly: `cat src/tabs/a.ts`"),
    "rW": ("claude", [], "Use the Write tool to create src/tabs/new.ts containing `export const n = 1;` "
                         "(do not read anything first)."),
    "rS": ("claude", [], READ.format("src/tabs/big.ts")),
    "rC": ("claude", [("PostToolUse", ["Read"], 10050)], READ.format("src/alpha.ts")),
    "xP": ("codex", [("PostToolUse", ["apply_patch"], 400)], "Change `1` to `2` in src/alpha.ts. Use apply_patch for the edit."),
    "xN0": ("codex", [], "Reply with ok."),
    "xN1": ("codex", [], "Run exactly this shell command: `cat src/alpha.ts`"),
    "xL": ("codex", [("PostToolUse", None, 100000)], "Run exactly this shell command: `cat src/alpha.ts`"),
}


def rules(repo, toks):
    d = repo / ".claude" / "rules"
    d.mkdir(parents=True)
    (d / "tabs.md").write_text(f'---\npaths:\n  - "src/tabs/**"\n---\n# Tabs rule\n- Marker {toks["TA"]}.\n')
    (d / "other.md").write_text(f'---\npaths:\n  - "src/other/**"\n---\n# Other rule\n- Marker {toks["TB"]}.\n')
    (d / "always.md").write_text(f"# Always rule\n- Marker {toks['TC']}.\n")
    head = f'---\npaths:\n  - "src/tabs/big.ts"\n---\n# Big rule\n- Marker {toks["TD1"]}.\n'
    tail = f"\n- End marker {toks['TD2']}.\n"
    fill = "- Filler line for the size probe of a path-scoped rule file.\n"
    body = (fill * (12000 // len(fill) + 1))[: 12000 - len(head) - len(tail)]
    (d / "big.md").write_text(head + body + tail)


def files(repo):
    for p in ("src/tabs/a.ts", "src/tabs/big.ts", "src/other/b.ts"):
        (repo / p).parent.mkdir(parents=True, exist_ok=True)
        (repo / p).write_text("export const x = 1;\n")


def claude_records(repo, toks):
    roots = [Path(os.environ.get("CLAUDE_CONFIG_DIR", Path.home() / ".claude")) / "projects", Path.home() / ".claude" / "projects"]
    key = re.sub(r"[^A-Za-z0-9]", "-", str(repo.resolve()))
    hits, seen = {k: [] for k in toks}, set()
    for root in roots:
        d = root / key
        if not d.is_dir():
            continue
        for f in d.rglob("*.jsonl"):
            if f.resolve() in seen:
                continue
            seen.add(f.resolve())
            for line in f.read_text(errors="replace").splitlines():
                try:
                    o = json.loads(line)
                except ValueError:
                    continue
                kind = o.get("type")
                att = (o.get("attachment") or {}).get("type")
                msg = o.get("message") or {}
                is_tool_result = isinstance(msg.get("content"), list) and any(
                    isinstance(c, dict) and c.get("type") == "tool_result" for c in msg["content"])
                for k, t in toks.items():
                    if t in line:
                        hits[k].append(f"{kind}/{att or ('tool_result' if is_tool_result else '-')}")
    return hits


def main():
    scratch = Path(sys.argv[1]).resolve()
    only = set(sys.argv[2:])
    for name, (host, emits, action) in CASES.items():
        out = RUNS / name
        if (only and name not in only) or (out / "summary.json").exists():
            continue
        if out.exists():
            shutil.rmtree(out)
        out.mkdir(parents=True)
        repo = scratch / name / "repo"
        if repo.parent.exists():
            shutil.rmtree(repo.parent)
        base.fixture(repo)
        files(repo)
        toks = {k: base.token() for k in ("TA", "TB", "TC", "TD1", "TD2", "TN")}
        if host == "claude":
            rules(repo, toks)
        else:
            (repo / "src" / "AGENTS.md").write_text(f"# src notes\n- Marker {toks['TN']}.\n")
        case = {"log": str(out / "probe.jsonl"),
                "emit": [{"event": ev, "tools": tools, "size": size, "start": base.token(), "end": base.token()}
                         for ev, tools, size in emits]}
        case_json = out / "case.json"
        case_json.write_text(json.dumps({**case, "tokens": toks}, indent=1))
        events = sorted({e[0] for e in emits}) or ["PostToolUse"]
        if host == "claude":
            base.claude_settings(repo, case_json, events)
        else:
            base.codex_hooks(repo, case_json, events)
        base.sh(["git", "add", "-A"], repo)
        base.sh(["git", "-c", "user.name=lab", "-c", "user.email=lab@example.invalid", "commit", "-qm", "probe"], repo)
        prompt = f"{action} {base.TAIL}"
        (out / "prompt.txt").write_text(prompt + "\n")
        if host == "claude":
            info, blob = base.run_claude(name, repo, prompt, out)
            records = claude_records(repo, {**toks, **{f"E{i}{s}": e[s] for i, e in enumerate(case["emit"]) for s in ("start", "end")}})
        else:
            info, blob = base.run_codex(name, repo, prompt, out, scratch)
            records = {k: (["response_item"] if t in blob else []) for k, t in {**toks, **{f"E{i}{s}": e[s] for i, e in enumerate(case["emit"]) for s in ("start", "end")}}.items()}
            for line in blob.splitlines():
                for e in case["emit"]:
                    if e["start"] in line:
                        info["emit_item_chars"] = len(line)
        seen_line = base.last_seen(info.get("answer", ""))
        probe = [json.loads(l) for l in (out / "probe.jsonl").read_text().splitlines()] if (out / "probe.jsonl").exists() else []
        tools_touching_rules = sum(1 for l in (out / "stream.jsonl").read_text().splitlines()
                                   if '"tool_use"' in l and ".claude/rules" in l) if (out / "stream.jsonl").exists() else None
        summary = {"case": name, "host": host, "cli": base.sh([host, "--version"], scratch).stdout.strip(),
                   "records": records, "seen_line": seen_line, "tools_touching_rules": tools_touching_rules,
                   "probe_events": [{k: r.get(k) for k in ("hook_event_name", "tool_name", "emitted")} for r in probe],
                   **{k: v for k, v in info.items() if k != "answer"}}
        (out / "answer.txt").write_text(info.get("answer", "") + "\n")
        (out / "summary.json").write_text(json.dumps(summary, indent=1, ensure_ascii=False) + "\n")
        print(name, {k: v[:3] for k, v in records.items() if v}, flush=True)


if __name__ == "__main__":
    main()
