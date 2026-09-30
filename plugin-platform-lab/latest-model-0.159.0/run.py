#!/usr/bin/env python3
"""Run the SPEC.md cases. Usage: python3 run.py <product-checkout> [L01 L02 ...]

A case directory holding DONE is skipped; an existing case directory without DONE is
refused (a changed condition gets a new sibling experiment, never a rerun in place).
"""
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time

LAB = Path(__file__).resolve().parent
SUBJECT = LAB / "subject" / "latest-model.py"
RUNS = LAB / "runs"
OK_PROMPT = "Reply with the single word OK."
HAIKU = "claude-haiku-4-5-20251001"


def codex_home():
    return Path(os.environ.get("CODEX_HOME") or Path.home() / ".codex")


def cache_meta(home):
    path = Path(home) / "models_cache.json"
    if not path.exists():
        return {"exists": False}
    raw = path.read_bytes()
    data = json.loads(raw)
    return {"exists": True, "sha256": hashlib.sha256(raw).hexdigest(),
            "fetched_at": data.get("fetched_at"), "etag": data.get("etag"),
            "client_version": data.get("client_version"),
            "slugs": [m.get("slug") for m in data.get("models", [])]}


def newest_per_family(models):
    best = {}
    for m in models:
        match = re.fullmatch(r"gpt-(\d+(?:\.\d+)*)-([a-z]+)", m.get("slug", ""))
        if not match or m.get("visibility") != "list":
            continue
        version = tuple(int(x) for x in match.group(1).split("."))
        family = match.group(2)
        if family not in best or version > best[family][0]:
            best[family] = (version, m["slug"])
    return {k: v[1] for k, v in sorted(best.items())}


class Case:
    def __init__(self, name):
        self.dir = RUNS / name
        self.rows = []
        self.n = 0

    def run(self, label, argv, env=None, cwd=None, extra=None):
        self.n += 1
        stem = f"{self.n:02d}-{label}"
        start = time.monotonic()
        proc = subprocess.run(argv, cwd=cwd, env=env, stdin=subprocess.DEVNULL,
                              capture_output=True, text=True)
        elapsed = round((time.monotonic() - start) * 1000)
        (self.dir / f"{stem}.stdout").write_text(proc.stdout)
        (self.dir / f"{stem}.stderr").write_text(proc.stderr)
        row = {"label": stem, "argv": argv, "cwd": str(cwd) if cwd else None,
               "exit": proc.returncode, "elapsed_ms": elapsed}
        row.update(extra or {})
        self.rows.append(row)
        return proc, row

    def finish(self, summary):
        (self.dir / "metrics.json").write_text(json.dumps(self.rows, indent=1) + "\n")
        (self.dir / "summary.json").write_text(json.dumps(summary, indent=1) + "\n")
        (self.dir / "DONE").write_text(datetime.datetime.utcnow().isoformat() + "Z\n")


def env_with(**changes):
    env = dict(os.environ)
    env["CXC_MODE"] = "off"
    for key, value in changes.items():
        if value is None:
            env.pop(key, None)
        else:
            env[key] = value
    return env


def l01(case, product):
    summary = {"live": [], "bundled": []}
    for kind, argv in (("live", ["codex", "debug", "models"]),
                       ("bundled", ["codex", "debug", "models", "--bundled"])):
        for i in range(3):
            before = cache_meta(codex_home())
            proc, row = case.run(f"{kind}{i + 1}", argv, env=env_with())
            after = cache_meta(codex_home())
            models = json.loads(proc.stdout)["models"] if proc.returncode == 0 else []
            summary[kind].append({
                "exit": proc.returncode, "elapsed_ms": row["elapsed_ms"],
                "slugs": [m["slug"] for m in models],
                "newest": newest_per_family(models),
                "cache_before": {k: before.get(k) for k in ("fetched_at", "etag", "client_version")},
                "cache_after": {k: after.get(k) for k in ("fetched_at", "etag", "client_version")},
                "cache_slugs_equal_output": after.get("slugs") == [m["slug"] for m in models]})
    return summary


def l02(case, product):
    timeline = []
    t0 = time.monotonic()
    for i in range(21):
        target = t0 + 60 * i
        time.sleep(max(0, target - time.monotonic()))
        proc, row = case.run(f"call{i:02d}", ["codex", "debug", "models"], env=env_with())
        meta = cache_meta(codex_home())
        timeline.append({"t_s": round(time.monotonic() - t0), "exit": proc.returncode,
                         "fetched_at": meta.get("fetched_at"), "etag": meta.get("etag")})
    changes = [p for p, q in zip(timeline, timeline[1:]) if p["fetched_at"] != q["fetched_at"]]
    return {"timeline": timeline, "fetched_at_changes": len(changes)}


def l03(case, product):
    real = codex_home() / "models_cache.json"
    out = {}
    with tempfile.TemporaryDirectory(prefix="l03-") as tmp:
        empty = Path(tmp) / "empty"
        empty.mkdir()
        stale = Path(tmp) / "stale"
        stale.mkdir()
        data = json.loads(real.read_text())
        fetched = datetime.datetime.fromisoformat(data["fetched_at"].replace("Z", "+00:00"))
        data["fetched_at"] = (fetched - datetime.timedelta(days=2)).isoformat().replace("+00:00", "Z")
        (stale / "models_cache.json").write_text(json.dumps(data))
        for name, home in (("a-empty", empty), ("b-stale-cache", stale)):
            before = cache_meta(home)
            live, _ = case.run(f"{name}-live", ["codex", "debug", "models"], env=env_with(CODEX_HOME=str(home)))
            bundled, _ = case.run(f"{name}-bundled", ["codex", "debug", "models", "--bundled"],
                                  env=env_with(CODEX_HOME=str(home)))
            after = cache_meta(home)
            live_models = json.loads(live.stdout)["models"] if live.returncode == 0 else None
            out[name] = {
                "live_exit": live.returncode,
                "live_equals_bundled": live.stdout == bundled.stdout,
                "live_equals_copied_cache": live_models == data["models"] if name == "b-stale-cache" else None,
                "live_has_gpt-6.1-sol": bool(live_models) and any(m["slug"] == "gpt-6.1-sol" for m in live_models),
                "cache_before": {k: before.get(k) for k in ("exists", "sha256", "fetched_at")},
                "cache_after": {k: after.get(k) for k in ("exists", "sha256", "fetched_at")},
                "files_after": sorted(p.name for p in home.iterdir())}
    return out


def resolver(case, label, args, env=None, cwd=None):
    proc, row = case.run(label, [sys.executable, str(SUBJECT)] + args, env=env or env_with(), cwd=cwd)
    return {"args": args, "exit": proc.returncode, "stdout": proc.stdout.strip(),
            "stderr": proc.stderr.strip(), "elapsed_ms": row["elapsed_ms"]}


L04_INPUTS = [["codex", "sol"], ["codex", "luna"], ["codex", "astra"], ["codex", "terra"],
              ["codex", "gpt-6-sol"], ["codex", "gpt-5.6-luna"], ["codex", "gpt-5.5"], ["codex", "o3"],
              ["codex", "sol", "--effort", "xhigh"], ["codex", "luna", "--effort", "ultra"],
              ["claude", "opus"], ["claude", "sonnet"], ["claude", "claude-opus-5-5"],
              ["claude", "opus", "--effort", "xhigh"], ["claude", "opus", "--effort", "ultra"]]


def l04(case, product):
    with tempfile.TemporaryDirectory(prefix="l04-project-") as project:
        return [resolver(case, f"r{i:02d}", args, cwd=project) for i, args in enumerate(L04_INPUTS, 1)]


def codex_tokens(text):
    match = re.search(r"tokens used\s*\n\s*([\d,]+)", text)
    return int(match.group(1).replace(",", "")) if match else None


def l05(case, product):
    l04_summary = json.loads((RUNS / "L04" / "summary.json").read_text())
    resolved = {tuple(r["args"]): r["stdout"] for r in l04_summary if r["exit"] == 0}
    out = []
    runs = [("sol", "low"), ("luna", "low"), ("astra", "low"), ("sol", "xhigh")]
    for family, effort in runs:
        model = resolved.get(("codex", family))
        if model is None:
            out.append({"family": family, "effort": effort, "skipped": "L04 resolution failed"})
            continue
        argv = ["codex", "exec", "-m", model, "-c", f'model_reasoning_effort="{effort}"',
                "-s", "read-only", "--ephemeral", OK_PROMPT]
        proc, row = case.run(f"codex-{family}-{effort}", argv, env=env_with(), cwd=product)
        both = proc.stdout + "\n" + proc.stderr
        header = re.search(r"^model:\s*(\S+)", both, re.M)
        row["total_tokens"] = codex_tokens(both)
        out.append({"requested": model, "effort": effort, "exit": proc.returncode,
                    "header_model": header.group(1) if header else None,
                    "tokens_used": row["total_tokens"], "elapsed_ms": row["elapsed_ms"]})
    for family in ("opus", "sonnet"):
        model = resolved.get(("claude", family))
        if model is None:
            out.append({"family": family, "skipped": "L04 resolution failed"})
            continue
        argv = ["claude", "-p", OK_PROMPT, "--model", model, "--effort", "low", "--output-format", "json"]
        proc, row = case.run(f"claude-{family}", argv, env=env_with(), cwd=product)
        data = json.loads(proc.stdout) if proc.returncode == 0 else {}
        usage = data.get("usage", {})
        row["input_tokens"] = usage.get("input_tokens")
        row["output_tokens"] = usage.get("output_tokens")
        out.append({"requested": model, "exit": proc.returncode,
                    "model_usage": list(data.get("modelUsage", {}).keys()),
                    "result": data.get("result"), "elapsed_ms": row["elapsed_ms"]})
    return out


def l06(case, product):
    out = {}
    argv = ["claude", "-p", OK_PROMPT, "--model", "sonnet", "--effort", "low", "--output-format", "json"]
    with tempfile.TemporaryDirectory(prefix="l06-") as tmp:
        plain = Path(tmp) / "plain"
        plain.mkdir()
        env = env_with(ANTHROPIC_DEFAULT_SONNET_MODEL=HAIKU)
        proc, _ = case.run("a-env-claude", argv, env=env, cwd=plain)
        data = json.loads(proc.stdout) if proc.returncode == 0 else {}
        out["a-env"] = {"claude_exit": proc.returncode,
                        "model_usage": list(data.get("modelUsage", {}).keys()),
                        "resolver": resolver(case, "a-env-resolver", ["claude", "sonnet"], env=env, cwd=plain)}
        project = Path(tmp) / "project"
        (project / ".claude").mkdir(parents=True)
        (project / ".claude" / "settings.json").write_text(
            json.dumps({"env": {"ANTHROPIC_DEFAULT_SONNET_MODEL": HAIKU}}) + "\n")
        proc, _ = case.run("b-settings-claude", argv, env=env_with(), cwd=project)
        data = json.loads(proc.stdout) if proc.returncode == 0 else {}
        out["b-project-settings"] = {"claude_exit": proc.returncode,
                                     "model_usage": list(data.get("modelUsage", {}).keys()),
                                     "resolver": resolver(case, "b-settings-resolver", ["claude", "sonnet"],
                                                          cwd=project)}
    return out


def l07(case, product):
    out = {}
    out["no-codex-on-path"] = resolver(case, "no-codex", ["codex", "sol"], env=env_with(PATH="/usr/bin:/bin"))
    with tempfile.TemporaryDirectory(prefix="l07-empty-") as empty:
        out["empty-codex-home"] = resolver(case, "empty-home", ["codex", "sol"], env=env_with(CODEX_HOME=empty))
    return out


CASES = {"L01": l01, "L02": l02, "L03": l03, "L04": l04, "L05": l05, "L06": l06, "L07": l07}


def main():
    product = Path(sys.argv[1]).resolve()
    names = sys.argv[2:] or list(CASES)
    if not SUBJECT.exists() or not (LAB / "subject" / "SHA256").exists():
        sys.exit("subject/latest-model.py and subject/SHA256 must exist before any case runs")
    want = (LAB / "subject" / "SHA256").read_text().split()[0]
    if hashlib.sha256(SUBJECT.read_bytes()).hexdigest() != want:
        sys.exit("subject/latest-model.py does not match subject/SHA256")
    for name in names:
        case = Case(name)
        if (case.dir / "DONE").exists():
            print(f"{name}: DONE, skipped")
            continue
        if case.dir.exists():
            sys.exit(f"{name}: incomplete directory exists; use a new sibling experiment")
        case.dir.mkdir(parents=True)
        print(f"{name}: running", flush=True)
        case.finish(CASES[name](case, product))
        print(f"{name}: done", flush=True)


if __name__ == "__main__":
    main()
