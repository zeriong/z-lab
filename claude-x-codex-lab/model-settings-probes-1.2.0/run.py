#!/usr/bin/env python3
"""Run SPEC.md's probes. Usage: python3 run.py <because-i-needed checkout> [CASE ...]

State-aware: runs/<case>/DONE is skipped; a case directory without DONE is refused. Fixtures are written once.
"""
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
RUNS = LAB / "runs"
FIX = LAB / "fixtures"
CASES = ("P01", "P02", "P03", "P04", "P05", "P06", "P07", "P08", "P09")
USER_CONFIG = {
    "codex_worker": {"type": "string", "title": "Codex worker model", "description": "family",
                     "default": "terra", "options": ["terra", "luna", "sol", "astra"]},
    "review_effort": {"type": "string", "title": "Review effort", "description": "effort",
                      "default": "xhigh", "options": ["low", "medium", "high", "xhigh", "max"]},
}
SKILL = "---\nname: show\ndescription: probe\n---\nVALUE=[${user_config.codex_worker}] EFFORT=[${user_config.review_effort}]\n"
HOOK_CMD = "sh -c 'env | grep -E \"^(CLAUDE_CONFIG_DIR|CLAUDE_PLUGIN_OPTION)\" > hook-env.txt; true'"
MODULE = """import type { Register } from 'claude-code'

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const all = await $.config.list()
    const rows = all.filter(row => JSON.stringify(row.provider).includes('pcmod'))
    const ran = await $.process.run(['sh', '-c', 'env | grep -c "^CLAUDE_CONFIG_DIR=" || true'])
    await $.fs.write('mod-probe.json', JSON.stringify({ options, count: all.length, rows, configDirVars: ran.stdout.trim() }, null, 1))
    return result
  })
}
"""
PICK = r"""set stty_init "rows 50 cols 160"
log_file -noappend [lindex $argv 0]
proc wait_for {n} { expect -timeout $n "@@never@@" {} timeout {} eof {} }
if {[llength $argv] > 1} { spawn -noecho claude --plugin-dir [lindex $argv 1] } else { spawn -noecho claude }
expect -timeout 40 "/effort"
wait_for 2
send "/config\r"
expect -timeout 20 "Search settings"
wait_for 1
send "codex"
expect -timeout 10 "Codex worker model" { send_log "\n@@MARK row@@\n" } timeout { send_log "\n@@MARK no-row@@\n" }
wait_for 1
send "\r"; wait_for 2
send "\r"
expect -timeout 15 "Enter to confirm" { send_log "\n@@MARK picker@@\n" } timeout { send_log "\n@@MARK no-picker@@\n" }
wait_for 1
send -- "\x1b\[B"; wait_for 2
send_log "\n@@MARK down@@\n"
send "\r"; wait_for 3
send_log "\n@@MARK confirm@@\n"
send "\x1b"; wait_for 2
send "\x1b"; wait_for 2
send "/exit\r"; wait_for 3
exit
"""
ASK = ("Use the Skill tool to run the skill pc:show. Then run exactly this Bash command: "
       "env | grep -i plugin_option || echo NONE . Reply with only two lines: the line starting VALUE= "
       "from the skill text, copied verbatim, and the command's output verbatim.")


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)


def make_fixtures():
    if FIX.exists():
        return
    mkt = FIX / "mkt"
    write(mkt / ".claude-plugin/marketplace.json", json.dumps({
        "name": "probe-mkt", "owner": {"name": "z-lab"},
        "plugins": [{"name": "pc", "source": "./plugins/pc", "version": "0.1.0"},
                    {"name": "pcmod", "source": "./plugins/pcmod", "version": "0.1.0"}]}, indent=1))
    for name in ("pc", "pcmod"):
        root = mkt / "plugins" / name
        write(root / ".claude-plugin/plugin.json", json.dumps(
            {"name": name, "version": "0.1.0", "description": "probe", "userConfig": USER_CONFIG}, indent=1))
        write(root / "skills/show/SKILL.md", SKILL)
    write(mkt / "plugins/pc/hooks/hooks.json", json.dumps(
        {"hooks": {"UserPromptSubmit": [{"hooks": [{"type": "command", "command": HOOK_CMD}]}]}}, indent=1))
    write(mkt / "plugins/pcmod/hooks/hooks.json", json.dumps({"modules": ["./register.ts"]}))
    write(mkt / "plugins/pcmod/hooks/register.ts", MODULE)
    cmkt = FIX / "codex-mkt"
    write(cmkt / ".claude-plugin/marketplace.json", json.dumps({
        "name": "probe-codex", "owner": {"name": "z-lab"},
        "plugins": [{"name": "pc", "source": "./plugins/pc", "version": "0.1.0"}]}, indent=1))
    write(cmkt / "plugins/pc/.codex-plugin/plugin.json", json.dumps({
        "name": "pc", "version": "0.1.0", "description": "probe", "skills": "./skills/", "userConfig": USER_CONFIG,
        "config": {"codex_worker": {"type": "string", "default": "terra", "enum": ["terra", "luna"]}}}, indent=1))
    write(cmkt / "plugins/pc/skills/show/SKILL.md", SKILL)
    write(FIX / "config-pick.exp", PICK)


def env_with(**changes):
    env = dict(os.environ)
    env["CXC_MODE"] = "off"
    for key, value in changes.items():
        if value is None:
            env.pop(key, None)
        else:
            env[key] = value
    return env


class Case:
    def __init__(self, name):
        self.dir = RUNS / name
        self.rows = []
        self.n = 0

    def run(self, label, argv, env=None, cwd=None, stdin_text=None, timeout=1800):
        self.n += 1
        stem = f"{self.n:02d}-{label}"
        start = time.monotonic()
        proc = subprocess.run(argv, cwd=cwd, env=env or env_with(), capture_output=True, text=True,
                              input=stdin_text, stdin=None if stdin_text is not None else subprocess.DEVNULL,
                              timeout=timeout)
        row = {"label": stem, "argv": argv if len(" ".join(argv)) < 3000 else argv[:4] + ["…"],
               "cwd": str(cwd) if cwd else None, "exit": proc.returncode,
               "elapsed_ms": round((time.monotonic() - start) * 1000)}
        (self.dir / f"{stem}.stdout").write_text(proc.stdout)
        (self.dir / f"{stem}.stderr").write_text(proc.stderr)
        self.rows.append(row)
        return proc, row

    def save(self, name, data):
        (self.dir / name).write_text(data if isinstance(data, str) else json.dumps(data, indent=1, ensure_ascii=False) + "\n")

    def finish(self, summary):
        self.save("metrics.json", self.rows)
        self.save("summary.json", summary)
        (self.dir / "DONE").write_text(time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) + "\n")


def read_json(path):
    try:
        return json.loads(Path(path).read_text())
    except (OSError, ValueError):
        return None


def plugin_configs(home):
    return (read_json(Path(home) / "settings.json") or {}).get("pluginConfigs")


def temp_dir(prefix):
    return Path(tempfile.mkdtemp(prefix=prefix)).resolve()


def install(case, home, plugin):
    env = env_with(CLAUDE_CONFIG_DIR=str(home))
    case.run("marketplace-add", ["claude", "plugin", "marketplace", "add", str(FIX / "mkt")], env=env)
    case.run(f"install-{plugin}", ["claude", "plugin", "install", f"{plugin}@probe-mkt"], env=env)
    return env


def claude_json(proc):
    try:
        data = json.loads(proc.stdout)
    except ValueError:
        return {}
    return {"result": data.get("result"), "models": sorted((data.get("modelUsage") or {}).keys()),
            "usage": data.get("usage"), "terminal_reason": data.get("terminal_reason")}


def stream_values(text):
    values = sorted(set(re.findall(r"VALUE=\[[^\]\n]*\] EFFORT=\[[^\]\n]*\]", text.replace("\\n", "\n"))))
    return values


def p01(case):
    home = temp_dir("p01-home-")
    proc, _ = case.run("validate", ["claude", "plugin", "validate", str(FIX / "mkt/plugins/pc")])
    env = install(case, home, "pc")
    conf, _ = case.run("configure-json", ["claude", "plugin", "configure", "pc@probe-mkt", "--json"], env=env)
    data = read_json_text(conf.stdout)
    case.finish({"home": str(home), "validate_exit": proc.returncode,
                 "validate_last_line": proc.stdout.strip().splitlines()[-1] if proc.stdout.strip() else "",
                 "choices": data.get("choices"), "inputs": data.get("inputs"),
                 "configured": data.get("configured"), "unconfigured": data.get("unconfigured")})


def read_json_text(text):
    try:
        return json.loads(text)
    except ValueError:
        return {}


def p02(case):
    home = temp_dir("p02-home-")
    env = install(case, home, "pc")
    steps = []
    for label, values in (("in-options", {"codex_worker": "luna"}), ("out-of-options", {"codex_worker": "bogus"})):
        proc, _ = case.run(f"values-{label}", ["claude", "plugin", "configure", "pc@probe-mkt", "--values-stdin"],
                           env=env, stdin_text=json.dumps(values))
        steps.append({"step": label, "sent": values, "exit": proc.returncode,
                      "stdout": proc.stdout.strip()[-400:], "stderr": proc.stderr.strip()[-400:],
                      "pluginConfigs": plugin_configs(home)})
    conf, _ = case.run("configure-json", ["claude", "plugin", "configure", "pc@probe-mkt", "--json"], env=env)
    data = read_json_text(conf.stdout)
    case.finish({"home": str(home), "settings_file": str(home / "settings.json"), "steps": steps,
                 "inputs_after": data.get("inputs"), "configured_after": data.get("configured")})


def seeded_home(prefix, project):
    home = temp_dir(prefix)
    paths = {str(project), os.path.realpath(project)}
    (home / ".claude.json").write_text(json.dumps({
        "hasCompletedOnboarding": True, "theme": "dark", "numStartups": 5,
        "projects": {p: {"hasTrustDialogAccepted": True, "hasCompletedProjectOnboarding": True} for p in paths}}))
    return home


def screen(log):
    raw = Path(log).read_text(errors="replace") if Path(log).exists() else ""
    marks = re.findall(r"@@MARK ([a-z-]+)@@", raw)
    flat = re.sub(r"\x1b\[[0-9;?<>=]*[ -/]*[@-~]", " ", raw)
    flat = " ".join(flat.split())
    row = re.search(r"Codex worker model[^\n]{0,80}?pcmod[^@]{0,40}", flat)
    picker = re.search(r"Codex worker model family · pcmod (.{0,120}?)Enter to confirm", flat)
    return {"marks": marks, "row_text": row.group(0) if row else None,
            "picker_text": picker.group(1).strip() if picker else None}


def p03(case):
    summary = {}
    for variant in ("a-installed", "b-plugin-dir"):
        project = temp_dir(f"p03{variant[0]}-project-")
        home = seeded_home(f"p03{variant[0]}-home-", project)
        env = env_with(CLAUDE_CONFIG_DIR=str(home))
        args = []
        if variant == "a-installed":
            install(case, home, "pcmod")
        else:
            args = [str(FIX / "mkt/plugins/pcmod")]
        log = case.dir / f"{variant}-pty.log"
        proc, row = case.run(f"{variant}-expect", ["expect", str(FIX / "config-pick.exp"), str(log), *args],
                             env=env, cwd=project, timeout=300)
        summary[variant] = {"home": str(home), "project": str(project), "expect_exit": proc.returncode,
                            **screen(log), "pluginConfigs_after": plugin_configs(home),
                            "project_claude_dir": sorted(p.name for p in (project / ".claude").glob("*"))
                            if (project / ".claude").exists() else []}
    project = temp_dir("p03c-project-")
    home = temp_dir("p03c-home-")
    env = install(case, home, "pcmod")
    proc, _ = case.run("c-headless", ["claude", "-p", "hello", "--output-format", "json"], env=env, cwd=project)
    summary["c-headless"] = {"home": str(home), "exit": proc.returncode, "terminal_reason": claude_json(proc).get("terminal_reason"),
                             "mod_probe": read_json(project / "mod-probe.json")}
    case.finish(summary)


def ask(case, label, project, extra, sources):
    argv = ["claude", "-p", ASK, "--model", "haiku", "--plugin-dir", str(FIX / "mkt/plugins/pc"),
            "--setting-sources", sources, "--allowedTools", "Skill", "Bash(env:*)",
            "--output-format", "stream-json", "--verbose", *extra]
    proc, row = case.run(label, argv, cwd=project, timeout=600)
    result = {}
    for line in proc.stdout.splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        if event.get("type") == "result":
            result = {"result": event.get("result"), "models": sorted((event.get("modelUsage") or {}).keys()),
                      "usage": event.get("usage")}
    return {"exit": proc.returncode, "stream_values": stream_values(proc.stdout), **result}


def p04(case):
    project = temp_dir("p04-project-")
    stores = {
        "a-inline": {"pc@inline": {"options": {"codex_worker": "luna"}}},
        "b-bare": {"pc": {"options": {"codex_worker": "sol"}}},
        "c-both": {"pc@inline": {"options": {"codex_worker": "luna"}}, "pc": {"options": {"codex_worker": "sol"}}},
        "d-none": None,
        "e-out-of-options": {"pc@inline": {"options": {"codex_worker": "bogus"}}},
    }
    summary = {"project": str(project)}
    for label, store in stores.items():
        extra = ["--settings", json.dumps({"pluginConfigs": store})] if store else []
        summary[label] = {"stored": store, **ask(case, label, project, extra, "project")}
    case.finish(summary)


def p05(case):
    summary = {}
    for label, files in (("a-project", {"settings.json": "luna"}), ("b-local", {"settings.local.json": "sol"}),
                         ("c-both", {"settings.json": "luna", "settings.local.json": "sol"})):
        project = temp_dir(f"p05{label[0]}-project-")
        for name, value in files.items():
            write(project / ".claude" / name, json.dumps({"pluginConfigs": {"pc@inline": {"options": {"codex_worker": value}}}}))
        summary[label] = {"project": str(project), "files": files, **ask(case, label, project, [], "project,local")}
    case.finish(summary)


def p06(case):
    home = temp_dir("p06-codex-home-")
    env = env_with(CODEX_HOME=str(home))
    add, _ = case.run("marketplace-add", ["codex", "plugin", "marketplace", "add", str(FIX / "codex-mkt")], env=env)
    plug, _ = case.run("plugin-add", ["codex", "plugin", "add", "pc@probe-codex"], env=env)
    listed, _ = case.run("plugin-list", ["codex", "plugin", "list"], env=env)
    binary = os.path.realpath(shutil.which("codex"))
    strings, _ = case.run("strings", ["sh", "-c", f"strings -n 6 '{binary}' | grep -o '[A-Za-z_]*PluginConfig[A-Za-z_]*' | sort | uniq -c"])
    near, _ = case.run("strings-near", ["sh", "-c", f"strings -n 6 '{binary}' | grep -o '.\\{{0,60\\}}PluginConfig.\\{{0,60\\}}' | head -20"])
    feats, _ = case.run("features", ["codex", "features", "list"], env=env)
    config = (home / "config.toml").read_text() if (home / "config.toml").exists() else None
    case.finish({"codex_home": str(home), "binary": binary, "add_exit": plug.returncode,
                 "add_stdout": plug.stdout.strip(), "config_toml": config,
                 "plugin_list_line": [l for l in listed.stdout.splitlines() if "pc@" in l],
                 "plugin_config_strings": near.stdout.strip().splitlines(),
                 "request_user_input_rows": [l for l in feats.stdout.splitlines() if "request_user_input" in l]})


def p07(case, product):
    resolver = product / "plugins/peer-coding/scripts/latest-model.py"
    table = []
    for family in ("terra", "luna", "sol", "astra"):
        for effort in ("low", "medium", "high", "xhigh", "max", "ultra"):
            proc, _ = case.run(f"{family}-{effort}", ["python3", str(resolver), "codex", family, "--effort", effort])
            table.append({"family": family, "effort": effort, "exit": proc.returncode, "stdout": proc.stdout.strip(),
                          "stderr": proc.stderr.strip()[-200:]})
    case.finish({"resolver": str(resolver), "table": table})


def header(log):
    model = re.search(r"^model: (.+)$", log, re.M)
    effort = re.search(r"^reasoning effort: (.+)$", log, re.M)
    tokens = re.search(r"tokens used\n([\d,]+)", log)
    return {"model": model and model.group(1).strip(), "effort": effort and effort.group(1).strip(),
            "tokens_used": tokens and int(tokens.group(1).replace(",", ""))}


def p08(case, product):
    repo = temp_dir("p08-repo-")
    git = lambda *a: subprocess.run(["git", "-C", str(repo), *a], check=True, capture_output=True)
    git("init", "-q")
    write(repo / "README.md", "probe\n")
    git("add", ".")
    git("-c", "user.name=z-lab", "-c", "user.email=z-lab@example.invalid", "commit", "-qm", "init")
    resolver = product / "plugins/peer-coding/scripts/latest-model.py"
    schema = product / "plugins/peer-coding/skills/run/references/review.schema.json"
    out = {}
    m, _ = case.run("resolve-terra", ["python3", str(resolver), "codex", "terra", "--effort", "high"])
    worker_model = m.stdout.strip()
    proc, row = case.run("worker", ["codex", "exec", "-m", worker_model, "-c", "model_reasoning_effort=high",
                                    "-C", str(repo), "-s", "workspace-write",
                                    "-c", 'project_doc_fallback_filenames=["CLAUDE.md"]',
                                    "-o", str(case.dir / "worker-return.md"),
                                    "Create a file named hello.txt containing exactly the text hi followed by a newline. "
                                    "Do nothing else."], timeout=1200)
    out["worker"] = {"requested": worker_model, "exit": proc.returncode, **header(proc.stdout + proc.stderr),
                     "hello_txt": (repo / "hello.txt").read_text() if (repo / "hello.txt").exists() else None,
                     "elapsed_ms": row["elapsed_ms"]}
    git("add", "-A")
    git("-c", "user.name=z-lab", "-c", "user.email=z-lab@example.invalid", "commit", "-qm", "hello")
    write(repo / "div.py", "def div(a, b):\n    return a / b\n")
    git("add", "-A")
    git("-c", "user.name=z-lab", "-c", "user.email=z-lab@example.invalid", "commit", "-qm", "div")
    m, _ = case.run("resolve-astra", ["python3", str(resolver), "codex", "astra", "--effort", "xhigh"])
    reviewer_model = m.stdout.strip()
    review_file = case.dir / "review.json"
    proc, row = case.run("reviewer", ["codex", "exec", "-m", reviewer_model, "-c", "model_reasoning_effort=xhigh",
                                      "-C", str(repo), "-s", "read-only",
                                      "-c", 'project_doc_fallback_filenames=["CLAUDE.md"]',
                                      "--output-schema", str(schema), "-o", str(review_file),
                                      "You are reviewing the last commit of this repository (git show HEAD). Report "
                                      "findings only, as JSON in the given schema."], timeout=1800)
    review = read_json(review_file)
    out["reviewer"] = {"requested": reviewer_model, "exit": proc.returncode, **header(proc.stdout + proc.stderr),
                       "parses": review is not None,
                       "top_level_keys": sorted(review.keys()) if isinstance(review, dict) else None,
                       "elapsed_ms": row["elapsed_ms"]}
    case.finish({"repo": str(repo), **out})


def p09(case):
    project = temp_dir("p09-project-")
    config_dir = str(Path.home() / ".claude")
    env = env_with(CLAUDE_CONFIG_DIR=config_dir)
    prompt = ("Run exactly this Bash command: env | grep -c '^CLAUDE_CONFIG_DIR=' || true . "
              "Reply with only its output.")
    proc, _ = case.run("bash-tool", ["claude", "-p", prompt, "--model", "haiku", "--setting-sources", "project",
                                     "--plugin-dir", str(FIX / "mkt/plugins/pc"),
                                     "--plugin-dir", str(FIX / "mkt/plugins/pcmod"),
                                     "--allowedTools", "Bash(env:*)", "--output-format", "json"],
                       env=env, cwd=project, timeout=600)
    hook = (project / "hook-env.txt").read_text() if (project / "hook-env.txt").exists() else None
    case.finish({"project": str(project), "CLAUDE_CONFIG_DIR": config_dir, "exit": proc.returncode,
                 "bash_tool": claude_json(proc), "hook_env": hook,
                 "mod_probe": read_json(project / "mod-probe.json")})


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    product = Path(sys.argv[1]).resolve()
    wanted = sys.argv[2:] or list(CASES)
    make_fixtures()
    RUNS.mkdir(exist_ok=True)
    head = subprocess.run(["git", "-C", str(product), "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
    stamp = RUNS / "PRODUCT"
    if not stamp.exists():
        stamp.write_text(f"{product}\n{head}\n")
    versions = RUNS / "VERSIONS"
    if not versions.exists():
        versions.write_text(subprocess.run(["sh", "-c", "claude --version; codex --version; expect -v; sw_vers -productVersion"],
                                           capture_output=True, text=True).stdout)
    for name in wanted:
        case_dir = RUNS / name
        if (case_dir / "DONE").exists():
            print(f"{name}: done, skipped")
            continue
        if case_dir.exists():
            sys.exit(f"{name}: incomplete run directory exists; inspect and remove it to rerun")
        case_dir.mkdir()
        case = Case(name)
        fn = globals()[name.lower()]
        fn(case, product) if name in ("P07", "P08") else fn(case)
        print(f"{name}: done")


if __name__ == "__main__":
    main()
