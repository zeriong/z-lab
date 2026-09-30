#!/usr/bin/env python3
"""Run SPEC.md's cases. Usage: python3 run.py <because-i-needed checkout> [K01 K02 K03 K04 K05 K07 K06a]

State-aware: a case directory holding DONE is skipped, an existing one without DONE is refused. Every CLI call runs
with a temporary CLAUDE_CONFIG_DIR / CODEX_HOME (and, for Claude, a temporary project as cwd).
"""
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import time

LAB = Path(__file__).resolve().parent
RUNS = LAB / "runs"
OLD, NEW = "bin", "because-i-needed"
K06_HOMES = Path(os.environ.get("TMPDIR", "/tmp")) / "z-lab-marketplace-rename-k06"


def git(*args, cwd):
    subprocess.run(["git", "-c", "user.name=lab", "-c", "user.email=lab@example.invalid", *args],
                   cwd=cwd, check=True, capture_output=True, text=True)


class Server:
    """Smart-HTTP git over 127.0.0.1 (git http-backend as CGI)."""

    def __init__(self, base):
        self.root = base / "srv"
        self.root.mkdir()
        web = base / "web"
        (web / "cgi-bin").mkdir(parents=True)
        script = web / "cgi-bin" / "git"
        script.write_text(f'#!/bin/sh\nexport GIT_PROJECT_ROOT="{self.root}" GIT_HTTP_EXPORT_ALL=1\nexec git http-backend\n')
        script.chmod(0o755)
        with socket.socket() as s:
            s.bind(("127.0.0.1", 0))
            self.port = s.getsockname()[1]
        self.proc = subprocess.Popen([sys.executable, "-m", "http.server", "--cgi", str(self.port), "--bind", "127.0.0.1"],
                                     cwd=web, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(50):
            try:
                socket.create_connection(("127.0.0.1", self.port), timeout=0.2).close()
                break
            except OSError:
                time.sleep(0.1)

    def url(self, name):
        return f"http://127.0.0.1:{self.port}/cgi-bin/git/{name}.git"

    def stop(self):
        self.proc.terminate()


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n")


def make_probe(base, server, name):
    """A git repository holding the probe marketplace named OLD, pushed to a bare repo on the server."""
    src = base / "src" / name
    for plugin, skill, extra in (("probe-a", "hello", True), ("probe-b", "bye", False)):
        root = src / "plugins" / plugin
        manifest = {"name": plugin, "version": "1.0.0", "description": f"{plugin} probe", "author": {"name": "lab"}}
        if extra:
            manifest["mcpServers"] = {"probe-mcp": {"command": sys.executable, "args": ["-c", "pass"]}}
        write_json(root / ".claude-plugin" / "plugin.json", manifest)
        write_json(root / ".codex-plugin" / "plugin.json", {**manifest, "skills": "./skills/"})
        (root / "skills" / skill).mkdir(parents=True)
        (root / "skills" / skill / "SKILL.md").write_text(f"---\nname: {skill}\ndescription: {plugin} {skill} probe skill\n---\n\nSay {skill}.\n")
        if extra:
            write_json(root / "hooks" / "hooks.json", {"hooks": {"UserPromptSubmit": [{"hooks": [
                {"type": "command", "command": "echo probe-a-hook"}]}]}})
    write_json(src / ".claude-plugin" / "marketplace.json", {
        "name": OLD, "owner": {"name": "lab"}, "metadata": {"description": "probe", "version": "1.0.0"},
        "plugins": [{"name": p, "source": f"./plugins/{p}", "version": "1.0.0", "description": f"{p} probe"}
                    for p in ("probe-a", "probe-b")]})
    git("init", "-q", "-b", "main", cwd=src)
    git("add", "-A", cwd=src)
    git("commit", "-qm", "probe marketplace", cwd=src)
    git("clone", "-q", "--bare", str(src), str(server.root / f"{name}.git"), cwd=base)
    git("remote", "add", "origin", str(server.root / f"{name}.git"), cwd=src)
    return src


def rename(src):
    path = src / ".claude-plugin" / "marketplace.json"
    data = json.loads(path.read_text())
    data["name"] = NEW
    write_json(path, data)
    git("commit", "-qam", "rename marketplace", cwd=src)
    git("push", "-q", "origin", "main", cwd=src)


class Case:
    def __init__(self, name):
        self.dir = RUNS / name
        self.rows, self.snaps, self.n = [], {}, 0

    def run(self, label, argv, env, cwd):
        self.n += 1
        stem = f"{self.n:02d}-{label}"
        start = time.monotonic()
        proc = subprocess.run(argv, cwd=cwd, env=env, capture_output=True, text=True, stdin=subprocess.DEVNULL)
        row = {"step": stem, "argv": argv, "cwd": str(cwd), "exit": proc.returncode,
               "elapsed_ms": round((time.monotonic() - start) * 1000)}
        (self.dir / f"{stem}.out").write_text(f"$ {' '.join(argv)}\n--- stdout\n{proc.stdout}\n--- stderr\n{proc.stderr}")
        self.rows.append(row)
        return proc

    def finish(self, summary):
        (self.dir / "metrics.json").write_text(json.dumps(self.rows, indent=1) + "\n")
        (self.dir / "summary.json").write_text(json.dumps({"snapshots": self.snaps, **summary}, indent=1) + "\n")
        (self.dir / "DONE").write_text(time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) + "\n")


def base_env(**changes):
    env = dict(os.environ, CXC_MODE="off", DISABLE_AUTOUPDATER="1")
    env.update(changes)
    return env


def files_under(root, patterns):
    out = {}
    for pattern in patterns:
        for f in sorted(Path(root).glob(pattern)):
            if f.is_file():
                out[str(f.relative_to(root))] = f.read_text(errors="replace")
    return out


def tree(root, depth=4):
    root = Path(root)
    if not root.exists():
        return []
    return sorted(str(p.relative_to(root)) for p in root.rglob("*") if p.is_dir() and len(p.relative_to(root).parts) <= depth)


def claude_snapshot(case, label, cfg, project):
    env = base_env(CLAUDE_CONFIG_DIR=str(cfg))
    mk = case.run(f"{label}-marketplaces", ["claude", "plugin", "marketplace", "list", "--json"], env, project)
    pl = case.run(f"{label}-plugins", ["claude", "plugin", "list", "--json"], env, project)
    def parse(proc):
        try:
            return json.loads(proc.stdout)
        except ValueError:
            return {"unparsed": proc.stdout[-2000:], "stderr": proc.stderr[-1000:]}
    case.snaps[label] = {
        "marketplaces": parse(mk), "plugins": parse(pl),
        "config_files": files_under(cfg, ["settings.json", "settings.local.json", "plugins/*.json"]),
        "project_files": files_under(project, [".claude/settings.json", ".claude/settings.local.json"]),
        "cache_tree": tree(Path(cfg) / "plugins" / "cache", 3)}


def codex_snapshot(case, label, home, cwd):
    env = base_env(CODEX_HOME=str(home))
    mk = case.run(f"{label}-marketplaces", ["codex", "plugin", "marketplace", "list"], env, cwd)
    pl = case.run(f"{label}-plugins", ["codex", "plugin", "list"], env, cwd)
    pi = case.run(f"{label}-prompt-input", ["codex", "debug", "prompt-input", "hi"], env, cwd)
    text = pi.stdout
    case.snaps[label] = {
        "marketplace_list": mk.stdout[-3000:], "plugin_list_probe_lines": [l for l in pl.stdout.splitlines() if "probe" in l],
        "config_toml": files_under(home, ["config.toml"]).get("config.toml"),
        "cache_tree": tree(Path(home) / "plugins" / "cache", 3),
        "prompt_input": {"exit": pi.returncode, "hello_skill": "probe-a hello probe skill" in text,
                         "bye_skill": "probe-b bye probe skill" in text, "hook_marker": "probe-a-hook" in text}}


def claude_flow(case, base, server, name, source):
    cfg, project = base / f"{name}-cfg", base / f"{name}-project"
    project.mkdir()
    git("init", "-q", cwd=project)
    src = make_probe(base, server, name)
    where = server.url(name) if source == "git" else str(src)
    env = base_env(CLAUDE_CONFIG_DIR=str(cfg))
    c = lambda label, *args: case.run(label, ["claude", "plugin", *args], env, project)
    c("add", "marketplace", "add", where)
    c("install-a-old", "install", f"probe-a@{OLD}")
    claude_snapshot(case, "1-installed", cfg, project)
    rename(src)
    c("update-old", "marketplace", "update", OLD)
    claude_snapshot(case, "2-after-update", cfg, project)
    c("update-a-old", "update", f"probe-a@{OLD}")
    c("install-b-old", "install", f"probe-b@{OLD}")
    c("install-b-new", "install", f"probe-b@{NEW}")
    claude_snapshot(case, "3-after-installs", cfg, project)
    c("remove-old", "marketplace", "remove", OLD)
    c("readd", "marketplace", "add", where)
    c("install-a-new", "install", f"probe-a@{NEW}")
    claude_snapshot(case, "4-migrated", cfg, project)


def codex_flow(case, base, server, name, source):
    home, cwd = base / f"{name}-codex", base / f"{name}-cwd"
    home.mkdir()
    cwd.mkdir()
    src = make_probe(base, server, name)
    where = server.url(name) if source == "git" else str(src)
    env = base_env(CODEX_HOME=str(home))
    c = lambda label, *args: case.run(label, ["codex", "plugin", *args], env, cwd)
    c("add", "marketplace", "add", where)
    c("add-a-old", "add", f"probe-a@{OLD}")
    config = home / "config.toml"
    with config.open("a") as f:
        f.write(f'\n[plugins."probe-a@{OLD}".mcp_servers.probe-mcp]\nenabled = false\n')
    codex_snapshot(case, "1-installed", home, cwd)
    rename(src)
    c("upgrade", "marketplace", "upgrade")
    codex_snapshot(case, "2-after-upgrade", home, cwd)
    c("add-b-old", "add", f"probe-b@{OLD}")
    c("add-b-new", "add", f"probe-b@{NEW}")
    codex_snapshot(case, "3-after-adds", home, cwd)
    c("remove-old", "marketplace", "remove", OLD)
    c("readd", "marketplace", "add", where)
    c("add-a-new", "add", f"probe-a@{NEW}")
    codex_snapshot(case, "4-migrated", home, cwd)


def k05(case, base, server, product):
    results = {}
    for host in ("claude", "codex"):
        for state in ("fresh", "had-bin"):
            name = f"k05-{host}-{state}"
            src = make_probe(base, server, name)
            shutil.copy2(product / "install.sh", src / "install.sh")
            git("add", "install.sh", cwd=src)
            git("commit", "-qm", "add installer", cwd=src)
            git("push", "-q", "origin", "main", cwd=src)
            home = base / f"{name}-home"
            home.mkdir()
            key = "CLAUDE_CONFIG_DIR" if host == "claude" else "CODEX_HOME"
            env = base_env(**{key: str(home), "BIN_REPO_URL": server.url(name), "BIN_RAW_URL": "http://127.0.0.1:9/unused"})
            if state == "had-bin":
                if host == "claude":
                    case.run(f"{name}-pre-add", ["claude", "plugin", "marketplace", "add", server.url(name)], env, src)
                    case.run(f"{name}-pre-install", ["claude", "plugin", "install", f"probe-a@{OLD}"], env, src)
                else:
                    case.run(f"{name}-pre-add", ["codex", "plugin", "marketplace", "add", server.url(name)], env, src)
                    case.run(f"{name}-pre-install", ["codex", "plugin", "add", f"probe-a@{OLD}"], env, src)
            rename(src)
            dry = case.run(f"{name}-dry-run", ["bash", str(src / "install.sh"), "--host", host, "--only", "probe-a", "--dry-run"], env, src)
            real = case.run(f"{name}-real", ["bash", str(src / "install.sh"), "--host", host, "--only", "probe-a"], env, src)
            if host == "claude":
                claude_snapshot(case, f"{name}-after", home, src)
            else:
                codex_snapshot(case, f"{name}-after", home, src)
            results[name] = {"dry_run_exit": dry.returncode, "real_exit": real.returncode}
    return results


def k07(case, base, server):
    cfg, project = base / "k07-cfg", base / "k07-project"
    project.mkdir()
    git("init", "-q", cwd=project)
    src = make_probe(base, server, "k07")
    url = server.url("k07")
    env = base_env(CLAUDE_CONFIG_DIR=str(cfg))
    c = lambda label, *args: case.run(label, ["claude", "plugin", *args], env, project)
    c("add", "marketplace", "add", url)
    c("install-a-project", "install", f"probe-a@{OLD}", "--scope", "project")
    c("install-b-local", "install", f"probe-b@{OLD}", "--scope", "local")
    path = project / ".claude" / "settings.json"
    data = json.loads(path.read_text()) if path.exists() else {}
    data.setdefault("extraKnownMarketplaces", {})[OLD] = {"source": {"source": "git", "url": url}}
    data.setdefault("enabledPlugins", {})[f"probe-a@{OLD}"] = True
    write_json(path, data)
    claude_snapshot(case, "1-installed", cfg, project)
    rename(src)
    c("update-old", "marketplace", "update", OLD)
    claude_snapshot(case, "2-after-update", cfg, project)
    c("remove-old", "marketplace", "remove", OLD)
    claude_snapshot(case, "3-after-remove", cfg, project)
    c("readd", "marketplace", "add", url)
    c("install-a-new-default", "install", f"probe-a@{NEW}")
    c("install-b-new-local", "install", f"probe-b@{NEW}", "--scope", "local")
    claude_snapshot(case, "4-migrated", cfg, project)


def k06a(case, base):
    K06_HOMES.mkdir(parents=True, exist_ok=True)
    homes = {"claude-url": K06_HOMES / "claude-url", "claude-owner-repo": K06_HOMES / "claude-owner-repo",
             "codex-url": K06_HOMES / "codex-url"}
    for h in homes.values():
        if h.exists():
            sys.exit(f"{h} already exists; K06 homes must start empty")
        h.mkdir()
    cwd = K06_HOMES / "cwd"
    cwd.mkdir(exist_ok=True)
    for label, source in (("claude-url", "https://github.com/zeriong/because-i-needed.git"),
                          ("claude-owner-repo", "zeriong/because-i-needed")):
        env = base_env(CLAUDE_CONFIG_DIR=str(homes[label]))
        case.run(f"{label}-add", ["claude", "plugin", "marketplace", "add", source], env, cwd)
        case.run(f"{label}-install", ["claude", "plugin", "install", f"harness@{OLD}"], env, cwd)
        claude_snapshot(case, label, homes[label], cwd)
    env = base_env(CODEX_HOME=str(homes["codex-url"]))
    case.run("codex-url-add", ["codex", "plugin", "marketplace", "add", "https://github.com/zeriong/because-i-needed.git"], env, cwd)
    case.run("codex-url-install", ["codex", "plugin", "add", f"harness@{OLD}"], env, cwd)
    codex_snapshot(case, "codex-url", homes["codex-url"], cwd)
    return {"homes_kept_for_K06b": {k: str(v) for k, v in homes.items()}}


def main():
    product = Path(sys.argv[1]).resolve()
    names = sys.argv[2:] or ["K01", "K02", "K03", "K04", "K05", "K07", "K06a"]
    base = Path(tempfile.mkdtemp(prefix="mkt-rename-")).resolve()
    server = Server(base)
    try:
        for name in names:
            case = Case(name)
            if (case.dir / "DONE").exists():
                print(f"{name}: DONE, skipped")
                continue
            if case.dir.exists():
                sys.exit(f"{name}: incomplete directory exists; use a new sibling experiment")
            case.dir.mkdir(parents=True)
            print(f"{name}: running", flush=True)
            summary = {}
            if name in ("K01", "K02"):
                claude_flow(case, base, server, name.lower(), "git" if name == "K01" else "dir")
            elif name in ("K03", "K04"):
                codex_flow(case, base, server, name.lower(), "git" if name == "K03" else "path")
            elif name == "K05":
                summary = k05(case, base, server, product)
            elif name == "K07":
                k07(case, base, server)
            elif name == "K06a":
                summary = k06a(case, base)
            case.finish(summary)
            print(f"{name}: done", flush=True)
    finally:
        server.stop()


if __name__ == "__main__":
    main()
