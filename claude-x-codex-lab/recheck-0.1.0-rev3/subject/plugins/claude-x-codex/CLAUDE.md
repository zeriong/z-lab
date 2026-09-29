# claude-x-codex — development rules

Every shared rule in the root `CLAUDE.md` applies. This file holds only what is specific to claude-x-codex.

Contents: three skills (`skills/run` with six references and `review.schema.json`, `skills/mode`, `skills/audit`),
the hook `hooks/hooks.json` (UserPromptSubmit → `hooks/mode-context.sh`), and three scripts in `scripts/` shared by
the skills (`mode.sh`, `context-audit.sh`, `worktree-setup.sh`). No agents, no MCP servers. The root `install.sh` is
the marketplace installer, not part of this plugin.

---

## Rule 1 — Script invariants

- `mode-context.sh` runs on **every prompt** of every installed user. It always exits `0` and prints nothing while the
  mode is off, so a normal session pays no token cost.
- `context-audit.sh` is **read-only**: it never writes a file or changes git state. The audit skill's only allowed
  write is adding `.claude-x-codex/` to `.git/info/exclude`.
- `worktree-setup.sh` finds the main tree through `git rev-parse --git-common-dir`, so it works from the main tree,
  a subdirectory, or inside the worktree itself. It skips anything already present (idempotent).
- `mode.sh` resolves `CXC_MODE` → project flag → global flag → `off`. The flag file is one line, `mode=on|off`;
  anything else counts as unset.
- Scripts stay LF (`.gitattributes`) and executable (git mode `100755`), and bash 3.2 compatible — no associative
  arrays, `mapfile`, or `${var,,}`.

## Rule 2 — Copies of one fact change in the same commit

| Fact | Source | Copies |
|---|---|---|
| `CXC_*` defaults | `skills/run/SKILL.md` Configuration | five READMEs (Configuration), `host-*.md`, `transport-*.md` |
| Platform support | `skills/mode/SKILL.md` Platforms | five READMEs (Platforms) |
| Mode scopes and resolution order | `scripts/mode.sh` header | `skills/mode/SKILL.md` Scopes, five READMEs (Commands) |
| Review JSON shape | `skills/run/references/review.schema.json` | `templates.md` review prompt example |
| Hook note (four lines) | `hooks/mode-context.sh` | five READMEs (Heads-up) |
| What each vendor reads | `context-bridge.md` table | `context-audit.sh` parity column, `host-*.md` Native context |
| Command list | the three skill folders | five plugin READMEs (Commands), five root READMEs (Entry) |

## Rule 3 — Environment facts carry the version they were checked on

Checked on Claude Code 2.1.283, Codex CLI 0.157.1, and Orca 1.4.215 (2026-09-28). When one of these CLIs changes,
re-check the affected facts and update the versions in the README Requirements, `context-bridge.md`, and
`transport-standalone.md`.

- Codex `--profile <name>` loads `$CODEX_HOME/<name>.config.toml`. A legacy `[profiles.<name>]` table in `config.toml`
  makes `--profile` fail.
- `codex exec -c 'project_doc_fallback_filenames=["CLAUDE.md"]'` makes Codex read `CLAUDE.md` where there is no
  `AGENTS.md`; without it, Codex does not read `CLAUDE.md`.
- Claude Code reads `AGENTS.md` in a directory with no `CLAUDE.md`; where both exist it loads only `CLAUDE.md`.
  (The nested-directory check ran with the `Read` tool enabled, so it is weaker evidence than the root check.)
- `codex exec --output-schema <file>` and `claude -p … --json-schema '<schema>' --output-format json` (object in
  `.structured_output`) both enforce the review schema.
- `codex exec` appends piped stdin to its prompt, so every call ends with `< /dev/null`.
- `claude -p`: `--allowedTools` takes several values and swallows a prompt placed after it — the prompt goes right
  after `-p`.
- `claude -p` with the reviewer's `--allowedTools` list stays read-only: prompted to create a file, it had Write and
  Bash denied (`permission_denials`) and wrote nothing, with the user's `defaultMode` set to `auto`.
- The UserPromptSubmit hook fires once in a `claude -p` session too; `CXC_MODE=off` silences it.
- `disable-model-invocation: true` removes `mode` from the model's skill list; it stays a slash command.
- Orca `worker-start` takes `--model` and `--effort` and has no permission flag.

**Why:** the first draft of this plugin assumed several of these wrongly — profile tables inside `config.toml`,
the `--allowedTools` argument order, Claude not reading `AGENTS.md` — and each was found only by running the CLI.

## Rule 4 — After editing a script, run it

The hook running in a session is the installed copy (root Rule 1), so test the source directly, in temp directories,
with `CODEX_HOME` and `XDG_CONFIG_HOME` pointed at temp directories so the real user config is neither read nor written.
At minimum:

```bash
AP="$PWD/plugins/claude-x-codex"
T=$(mktemp -d) && git -C "$T" init -q
(cd "$T" && XDG_CONFIG_HOME="$T/cfg" bash "$AP/scripts/mode.sh" on >/dev/null)
echo '{"prompt":"x"}' | (cd "$T" && XDG_CONFIG_HOME="$T/cfg" CLAUDE_PLUGIN_ROOT="$AP" bash "$AP/hooks/mode-context.sh"); echo "exit=$?"  # note, 0
echo '{"prompt":"x"}' | (cd "$T" && CXC_MODE=off CLAUDE_PLUGIN_ROOT="$AP" bash "$AP/hooks/mode-context.sh"); echo "exit=$?"            # nothing, 0
before="$(git -C "$T" status --porcelain)"; (cd "$T" && CODEX_HOME="$T/codex" bash "$AP/scripts/context-audit.sh" >/dev/null)
[ "$before" = "$(git -C "$T" status --porcelain)" ] && echo read-only
rm -rf "$T"
```

When you change `worktree-setup.sh`, also run it from inside a linked worktree and confirm the copies land.
