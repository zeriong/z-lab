#!/usr/bin/env python3
"""Resolve the newest available model for a Codex or Claude model family."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import subprocess
import sys

CACHE_MAX_AGE_SECONDS = 300  # This provisional value comes from measurement; replace it with the measured refresh window.
CODEX_SLUG = re.compile(r"^gpt-(\d+(?:\.\d+)*)-(sol|luna|astra|terra)$")
CODEX_VERSION = re.compile(r"\d+(?:\.\d+)*")
CLAUDE_FAMILIES = ("opus", "sonnet", "haiku", "fable")
CLAUDE_EFFORTS = {"low", "medium", "high", "xhigh", "max"}


class ResolverError(Exception):
    def __init__(self, message, code=2):
        super().__init__(message)
        self.code = code


class Parser(argparse.ArgumentParser):
    def error(self, message):
        raise ResolverError(message)


def read_json(path, label):
    try:
        with path.open(encoding="utf-8") as stream:
            return json.load(stream)
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise ResolverError(f"cannot read {label} {path}: {exc}")


def codex_family(value):
    if value in ("sol", "luna", "astra", "terra"):
        return value, None
    match = CODEX_SLUG.fullmatch(value)
    if match:
        return match.group(2), value
    raise ResolverError(f"invalid Codex family or model id: {value}")


def codex_models():
    try:
        version_result = subprocess.run(["codex", "--version"], capture_output=True, text=True)
    except OSError as exc:
        raise ResolverError(f"cannot run codex --version: {exc}")
    version_match = CODEX_VERSION.search(version_result.stdout) if version_result.returncode == 0 else None
    if not version_match:
        raise ResolverError("cannot determine Codex CLI version from codex --version")
    client_version = version_match.group(0)

    try:
        result = subprocess.run(["codex", "debug", "models"], capture_output=True, text=True)
    except OSError as exc:
        raise ResolverError(f"cannot run codex debug models: {exc}")
    if result.returncode != 0:
        raise ResolverError(f"codex debug models exited with status {result.returncode}")
    try:
        catalog = json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise ResolverError(f"codex debug models returned bad JSON: {exc}")
    if not isinstance(catalog, dict) or not isinstance(catalog.get("models"), list):
        raise ResolverError("codex debug models JSON has no models list")

    codex_home = Path(os.environ.get("CODEX_HOME", str(Path.home() / ".codex")))
    cache_path = codex_home / "models_cache.json"
    cache = read_json(cache_path, "Codex model cache")
    if not isinstance(cache, dict):
        raise ResolverError(f"invalid Codex model cache {cache_path}: expected an object")
    if cache.get("client_version") != client_version:
        raise ResolverError(f"Codex model cache client_version does not match codex --version: {cache_path}")
    try:
        fetched_at = datetime.fromisoformat(cache["fetched_at"].replace("Z", "+00:00"))
        if fetched_at.tzinfo is None:
            raise ValueError("timestamp has no timezone")
        age = (datetime.now(timezone.utc) - fetched_at.astimezone(timezone.utc)).total_seconds()
    except (KeyError, AttributeError, TypeError, ValueError) as exc:
        raise ResolverError(f"invalid fetched_at in Codex model cache {cache_path}: {exc}")
    if age > CACHE_MAX_AGE_SECONDS:
        raise ResolverError(f"Codex model cache is stale: {cache_path}")

    def slugs(data):
        entries = data.get("models")
        if not isinstance(entries, list) or any(not isinstance(item, dict) or not isinstance(item.get("slug"), str)
                                                for item in entries):
            return None
        return [item["slug"] for item in entries]

    if slugs(cache) is None or slugs(cache) != slugs(catalog):
        raise ResolverError(f"Codex model cache slugs do not match codex debug models: {cache_path}")
    return catalog["models"]


def resolve_codex(value, effort):
    family, original = codex_family(value)
    models = codex_models()
    candidates = []
    for item in models:
        if not isinstance(item, dict) or item.get("visibility") != "list":
            continue
        match = CODEX_SLUG.fullmatch(item.get("slug", ""))
        if match and match.group(2) == family:
            version = tuple(int(part) for part in match.group(1).split("."))
            candidates.append((version, item))
    if not candidates:
        raise ResolverError(f"no listed Codex model found for family {family}")
    _, chosen = max(candidates, key=lambda candidate: candidate[0])
    if effort is not None:
        levels = chosen.get("supported_reasoning_levels")
        supported = {level.get("effort") for level in levels if isinstance(level, dict)} if isinstance(levels, list) else set()
        if effort not in supported:
            raise ResolverError(f"effort {effort} is not supported by {chosen['slug']}", 3)
    if original and original != chosen["slug"]:
        print(f"latest-model: raised {original} to {chosen['slug']} (newest {family})", file=sys.stderr)
    return chosen["slug"]


def claude_family(value):
    if value in CLAUDE_FAMILIES:
        return value, None
    parts = value.split("-")
    matches = [part for part in parts if part in CLAUDE_FAMILIES]
    if len(matches) != 1:
        raise ResolverError(f"invalid Claude family or model id: {value}")
    return matches[0], value


def claude_settings(project):
    if "LATEST_MODEL_MANAGED_SETTINGS" in os.environ:
        paths = [Path(os.environ["LATEST_MODEL_MANAGED_SETTINGS"])]
    elif sys.platform == "darwin":
        paths = [Path("/Library/Application Support/ClaudeCode/managed-settings.json")]
    else:
        paths = [Path("/etc/claude-code/managed-settings.json")]
    config_dir = Path(os.environ.get("CLAUDE_CONFIG_DIR", str(Path.home() / ".claude")))
    paths.extend((config_dir / "settings.json", project / ".claude/settings.json",
                  project / ".claude/settings.local.json"))
    return paths


def resolve_claude(value, effort, project):
    family, original = claude_family(value)
    if effort is not None and effort not in CLAUDE_EFFORTS:
        raise ResolverError(f"effort {effort} is not supported by Claude {family}", 3)
    variable = f"ANTHROPIC_DEFAULT_{family.upper()}_MODEL"
    if os.environ.get(variable):
        raise ResolverError(f"{variable} is set in the process environment")
    for path in claude_settings(project):
        if not path.exists():
            continue
        settings = read_json(path, "Claude settings file")
        if not isinstance(settings, dict) or ("env" in settings and not isinstance(settings["env"], dict)):
            raise ResolverError(f"invalid Claude settings file {path}: expected an object with an env object")
        env = settings.get("env", {})
        if env.get(variable):
            raise ResolverError(f"{variable} is set in {path}")
    if original:
        print(f"latest-model: raised {original} to {family} (newest {family})", file=sys.stderr)
    return family


def main(argv=None):
    parser = Parser(prog="latest-model.py", add_help=False)
    parser.add_argument("provider", choices=("codex", "claude"))
    parser.add_argument("family_or_id")
    parser.add_argument("--effort")
    parser.add_argument("--project", type=Path, default=Path.cwd())
    try:
        args = parser.parse_args(argv)
        if args.provider == "codex":
            resolved = resolve_codex(args.family_or_id, args.effort)
        else:
            resolved = resolve_claude(args.family_or_id, args.effort, args.project)
        print(resolved)
        return 0
    except ResolverError as exc:
        print(f"latest-model: {exc}", file=sys.stderr)
        return exc.code


if __name__ == "__main__":
    sys.exit(main())
