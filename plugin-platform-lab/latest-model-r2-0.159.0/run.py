#!/usr/bin/env python3
"""Run the SPEC.md cases. Usage: python3 run.py [L04r L06r L07r L08]

Reuses the sibling experiment's case machinery; a case directory holding DONE is skipped,
an existing one without DONE is refused.
"""
import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile

LAB = Path(__file__).resolve().parent
sys.path.insert(0, str(LAB.parent / "latest-model-0.159.0"))
import run as base  # noqa: E402  (the sibling's runner: Case, env_with, cache_meta, L04_INPUTS)

base.SUBJECT = LAB / "subject" / "latest-model.py"
base.RUNS = LAB / "runs"
HAIKU = base.HAIKU


def resolver(case, label, args, env=None, cwd=None, prefix=()):
    proc, row = case.run(label, list(prefix) + [sys.executable, str(base.SUBJECT)] + args,
                         env=env or base.env_with(), cwd=cwd)
    return {"args": args, "exit": proc.returncode, "stdout": proc.stdout.strip(),
            "stderr": proc.stderr.strip(), "elapsed_ms": row["elapsed_ms"]}


def l04r(case):
    with tempfile.TemporaryDirectory(prefix="l04r-project-") as project:
        inputs = base.L04_INPUTS + [["codex", "nova"]]
        return [resolver(case, f"r{i:02d}", args, cwd=project) for i, args in enumerate(inputs, 1)]


def l06r(case):
    out = {}
    with tempfile.TemporaryDirectory(prefix="l06r-") as tmp:
        plain = Path(tmp) / "plain"
        plain.mkdir()
        out["a-env"] = resolver(case, "a-env", ["claude", "sonnet"],
                                env=base.env_with(ANTHROPIC_DEFAULT_SONNET_MODEL=HAIKU), cwd=plain)
        project = Path(tmp) / "project"
        (project / ".claude").mkdir(parents=True)
        settings = project / ".claude" / "settings.json"
        settings.write_text(json.dumps({"env": {"ANTHROPIC_DEFAULT_SONNET_MODEL": HAIKU}}) + "\n")
        out["b-project-settings"] = resolver(case, "b-settings", ["claude", "sonnet"], cwd=project)
        settings.write_text('{"env": {"A": 1,}}\n')
        out["c-invalid-settings"] = resolver(case, "c-invalid", ["claude", "sonnet"], cwd=project)
    return out


def l07r(case):
    out = {"no-codex-on-path": resolver(case, "no-codex", ["codex", "sol"], env=base.env_with(PATH="/usr/bin:/bin"))}
    with tempfile.TemporaryDirectory(prefix="l07r-empty-") as empty:
        out["empty-codex-home"] = resolver(case, "empty-home", ["codex", "sol"], env=base.env_with(CODEX_HOME=empty))
    return out


def l08(case):
    real = base.codex_home()
    out = {}
    with tempfile.TemporaryDirectory(prefix="l08-") as tmp:
        for name, stale, sandboxed in (("a-fresh-sandboxed", False, True),
                                       ("b-stale-sandboxed", True, True),
                                       ("c-stale-unsandboxed", True, False)):
            home = Path(tmp) / name
            home.mkdir()
            for f in ("auth.json", "config.toml", "models_cache.json"):
                shutil.copy2(real / f, home / f)
            if stale:
                cache = json.loads((home / "models_cache.json").read_text())
                moved = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=10)
                cache["fetched_at"] = moved.isoformat().replace("+00:00", "Z")
                (home / "models_cache.json").write_text(json.dumps(cache))
            before = base.cache_meta(home)
            prefix = ("codex", "sandbox") if sandboxed else ()
            result = resolver(case, name, ["codex", "sol"], env=base.env_with(CODEX_HOME=str(home)), prefix=prefix)
            after = base.cache_meta(home)
            result["cache_fetched_at_before"] = before.get("fetched_at")
            result["cache_fetched_at_after"] = after.get("fetched_at")
            out[name] = result
    return out


CASES = {"L04r": l04r, "L06r": l06r, "L07r": l07r, "L08": l08}


def main():
    names = sys.argv[1:] or list(CASES)
    want = (LAB / "subject" / "SHA256").read_text().split()[0]
    if hashlib.sha256(base.SUBJECT.read_bytes()).hexdigest() != want:
        sys.exit("subject/latest-model.py does not match subject/SHA256")
    for name in names:
        case = base.Case(name)
        if (case.dir / "DONE").exists():
            print(f"{name}: DONE, skipped")
            continue
        if case.dir.exists():
            sys.exit(f"{name}: incomplete directory exists; use a new sibling experiment")
        case.dir.mkdir(parents=True)
        print(f"{name}: running", flush=True)
        case.finish(CASES[name](case))
        print(f"{name}: done", flush=True)


if __name__ == "__main__":
    main()
