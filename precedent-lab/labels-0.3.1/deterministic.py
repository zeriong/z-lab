#!/usr/bin/env python3
"""E8 deterministic part (no model). On a snapshot of the private repo, inject every governed tracked file into the
company's own arrival hook and into a context-rail hook, and compare the `### §` sets and modes. Then check that the
E7 targets still receive their prohibition line, slug and paragraph. Prints counts and booleans only.

usage: python3 deterministic.py <snapshot repo> <hook.py> [--targets <real-repo-0.2.0/local/targets.json>]
The snapshot holds the company hook at .claude/hooks/precedent-context.sh and the context-rail config at
.claude/context-rail.json; <hook.py> is copied next to them so it reads that config.
"""
import concurrent.futures
import json
import os
import re
import shutil
import subprocess
import sys
import uuid

REPO, HOOK = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
OLD = os.path.join(REPO, ".claude", "hooks", "precedent-context.sh")
NEW = os.path.join(REPO, ".claude", "hooks", "precedent-context-under-test.py")
EXT = re.compile(r"\.(ts|tsx|css|mjs|sh)$")
STOP_MARK = "change only with the user's confirmation"
RANK = {"none": 0, "noline": 1, "truncated": 2, "compressed": 3, "full": 4}


def governed(f):
    d = os.path.dirname(f)
    while True:
        if os.path.isfile(os.path.join(d, "PRECEDENT.md")):
            return True
        if d == REPO:
            return False
        d = os.path.dirname(d)


def inject(cmd, f):
    ev = {"tool_name": "Read", "tool_input": {"file_path": f}, "cwd": REPO, "session_id": "e8-" + uuid.uuid4().hex,
          "hook_event_name": "PostToolUse"}
    out = subprocess.run(cmd, input=json.dumps(ev), capture_output=True, text=True, cwd=REPO,
                         env=dict(os.environ, CLAUDE_PROJECT_DIR=REPO)).stdout.strip()
    text = json.loads(out)["hookSpecificOutput"]["additionalContext"] if out else ""
    head = text.split("\n", 1)[0]
    mode = ("none" if not text else "truncated" if ("(cut)" in text or "(잘림)" in text)
            else "compressed" if ("compressed" in head or "압축" in head)
            else "noline" if ("has no `##" in head or "절 없음" in head) else "full")
    return mode, set(re.findall(r"^### (§\S+)", text, re.M)), text


def main():
    shutil.copyfile(HOOK, NEW)
    try:
        files = [l for l in subprocess.run(["git", "-C", REPO, "ls-files"], capture_output=True, text=True).stdout.split("\n")
                 if l and EXT.search(l) and governed(os.path.join(REPO, l))]
        with concurrent.futures.ThreadPoolExecutor(8) as pool:
            res = list(pool.map(lambda r: (inject(["bash", OLD], os.path.join(REPO, r)),
                                           inject(["python3", NEW], os.path.join(REPO, r))), files))
        out = {"governed_files": len(files),
               "files_missing_slugs": sum(1 for o, n in res if o[1] - n[1]),
               "mode_regressions": sum(1 for o, n in res if RANK[n[0]] < RANK[o[0]]),
               "old_slugs": sum(len(o[1]) for o, _ in res), "new_slugs": sum(len(n[1]) for _, n in res),
               "worst_new_chars": max(len(n[2]) for _, n in res)}
        if "--targets" in sys.argv:
            targets = json.loads(open(sys.argv[sys.argv.index("--targets") + 1]).read())
            out["targets"] = {}
            for tid, t in sorted(targets.items()):
                f = os.path.join(REPO, t["file"])
                if not os.path.isfile(f):
                    out["targets"][tid] = {"file_exists": False}
                    continue
                _, slugs, text = inject(["python3", NEW], f)
                out["targets"][tid] = {"file_exists": True, "forbid_line": t["forbid_line"] in text,
                                       "slug": t["slug"] in text, "paragraph": STOP_MARK in text}
        print(json.dumps(out, ensure_ascii=False))
    finally:
        os.remove(NEW)


if __name__ == "__main__":
    main()
