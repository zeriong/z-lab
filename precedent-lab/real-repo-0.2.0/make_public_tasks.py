#!/usr/bin/env python3
"""Write tasks.public.json: local/tasks.json with every path, decision slug, component name and view name masked."""
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
TASKS = json.loads((HERE / "local" / "tasks.json").read_text())
TARGETS = json.loads((HERE / "local" / "targets.json").read_text())
MASK = json.loads((HERE / "local" / "mask.json").read_text())
VIEWS = MASK["views"]
COMPONENTS = MASK["components"]


def mask(text):
    for tid, t in TARGETS.items():
        text = text.replace(t["record"], f"<{tid} record>").replace(t["file"], f"<{tid} file>").replace(t["slug"], f"§<{tid} decision>")
    for old, new in MASK["extra_paths"]:
        text = text.replace(old, new)
    for old, new in VIEWS:
        text = text.replace(old, new)
    for c in COMPONENTS:
        text = text.replace(f"`{c}`", "`<component>`").replace(c, "<component>")
    return text


def main():
    out = {k: {"target": v["target"], "kind": v["kind"], "prompt": mask(v["prompt"])} for k, v in TASKS.items()}
    (HERE / "tasks.public.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
    print(json.dumps(out, indent=1, ensure_ascii=False)[:1500])


if __name__ == "__main__":
    main()
