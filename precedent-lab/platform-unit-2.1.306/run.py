#!/usr/bin/env python3
"""State-aware runner for SPEC.md — reuses ../platform-2.1.306-0.163.0/run.py with a Hangul filler.

usage: python3 run.py <scratch-dir>
"""
import importlib.util
import json
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("base", HERE.parent / "platform-2.1.306-0.163.0" / "run.py")
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
base.PROBE = HERE / "probe_hook.py"
FILLER = "도착주입확인용채움문장"
CASES = {
    "uK1": ("PostToolUse", ["Read"], 4000, base.READ),
    "uK2": ("PostToolUse", ["Read"], 9990, base.READ),
    "uK3": ("UserPromptSubmit", None, 4000, "Reply with ok."),
}


def main():
    scratch = Path(sys.argv[1]).resolve()
    for name, (event, tools, size, action) in CASES.items():
        out = HERE / "runs" / name
        if (out / "summary.json").exists():
            continue
        if out.exists():
            shutil.rmtree(out)
        out.mkdir(parents=True)
        repo = scratch / name / "repo"
        if repo.parent.exists():
            shutil.rmtree(repo.parent)
        base.fixture(repo)
        emit = {"event": event, "tools": tools, "size": size, "start": base.token(), "end": base.token()}
        case = {"log": str(out / "probe.jsonl"), "filler": FILLER, "emit": [emit]}
        case_json = out / "case.json"
        case_json.write_text(json.dumps(case, indent=1, ensure_ascii=False))
        prompt = f"{action} {base.TAIL}"
        (out / "prompt.txt").write_text(prompt + "\n")
        base.claude_settings(repo, case_json, [event])
        info, blob = base.run_claude(name, repo, prompt, out)
        records = [json.loads(l) for l in blob.splitlines() if l.strip()]
        texts = ["".join(r.get("content", "") for r in rec) for rec in records if isinstance(rec, list)]
        hit = [t for t in texts if emit["start"] in t]
        seen = base.last_seen(info["answer"])
        probe = [json.loads(l) for l in (out / "probe.jsonl").read_text().splitlines()] \
            if (out / "probe.jsonl").exists() else []
        summary = {
            "case": name, "cli": base.sh(["claude", "--version"], scratch).stdout.strip(), "event": event,
            "emitted": [r.get("emitted") for r in probe if r.get("emitted")],
            "rendered": [{"chars": len(t), "bytes": len(t.encode()), "persisted": "persisted-output" in t,
                          "start": emit["start"] in t, "end": emit["end"] in t} for t in hit],
            "seen_start": emit["start"] in seen, "seen_end": emit["end"] in seen, "seen_line": seen,
            **{k: v for k, v in info.items() if k != "answer"},
        }
        (out / "answer.txt").write_text(info["answer"] + "\n")
        (out / "summary.json").write_text(json.dumps(summary, indent=1, ensure_ascii=False) + "\n")
        print(name, summary["emitted"], summary["rendered"][:1], flush=True)


if __name__ == "__main__":
    main()
