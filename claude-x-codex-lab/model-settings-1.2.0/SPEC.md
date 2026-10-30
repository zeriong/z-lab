# peer-coding 1.2.0 — persistent model settings, measured as shipped

Frozen before running, 2026-10-30. Claude Code 2.1.314, Codex CLI 0.166.0, macOS 27.0.1.

## Objective
Measure the mechanism peer-coding 1.2.0 adds, with the real script, skill and dashboard: six model and effort settings
resolved env → project → Claude Code `/config` → global file → default (`scripts/settings.py`), set through the `mode`
skill on both hosts, loaded by every documented dispatch form, and shown on the dashboard. The platform behaviors it
relies on are measured in `../model-settings-probes-1.2.0/` and `../model-settings-probes-r2-1.2.0/`.

## Cases
- M01 Resolution matrix. The subject's `settings.py`, copied to a fake install path
  `<tmp>/plugins/cache/because-i-needed/peer-coding/1.2.0/scripts/` (so it reads the installed id), in a temporary git
  repository with temporary `HOME`, `XDG_CONFIG_HOME` and `CLAUDE_CONFIG_DIR`. For `codex-reviewer`, every one of the
  16 combinations of four levels present or absent — env `CXC_REVIEW_MODEL=gamma`, project `terra`, `/config`
  (`pluginConfigs["peer-coding@because-i-needed"]`) `astra`, global file `luna`. Record `get` and the `status --json`
  store; expected = the first present level in that order, else `sol`. Plus the same `/config` value under
  `peer-coding@inline` read by the subject at its own (non-cache) path, and ignored by the installed copy.
- M02 The dashboard. The product's `plugins/dashboard/scripts/dashboard.py` with `BECAUSE_I_NEEDED_PLUGIN_DIRS` = the
  subject: `--host claude --enabled ""` and `--host codex`, in a temporary repository, a defaults; b project settings
  `codex_reviewer=astra`, `review_effort=max`; c a `/config` value `codex_worker=luna` under `peer-coding@inline`.
  Record the line and the two model entries. Also time the two status commands five times each.
- M03 The `mode` skill run for real. Temporary git repository, temporary `XDG_CONFIG_HOME`.
  - Claude Code (`claude -p`, sonnet, `--plugin-dir` subject, `--setting-sources project`,
    `--permission-mode bypassPermissions`): a `/peer-coding:mode codex-reviewer astra`; b `/peer-coding:mode reviewer
    astra --global` (the skill maps "reviewer" on Claude to `codex-reviewer`); c `/peer-coding:mode status`. Record the
    project and global files after each, the reply, and `modelUsage`. The user's Claude config directory is read for the
    login and holds no `pluginConfigs` for peer-coding.
  - Codex (`codex exec --json --dangerously-bypass-hook-trust`, the newest `sol` at `medium`, `-s workspace-write`,
    temporary `CODEX_HOME` with a copy of the login file, the subject installed from a temporary local marketplace named
    `because-i-needed`): d `$peer-coding:mode codex-worker luna`; e `$peer-coding:mode status`. Record the files, the
    commands it ran with their exit codes, the reply and usage; the temporary home is removed after, and the login
    file's sha256 is recorded before and after.
- M04 The documented dispatch forms load the settings. From the subject's `transport-standalone.md`, the lines of each
  block from its opening `(` through the resolver line, closed with `)` (Codex worker, Codex reviewer, Claude worker —
  the last with its `cd` into a worktree directory), run with bash, `<plugin>` = the fake installed copy (both scripts), in a temporary
  repository: a defaults; b project `codex_worker=luna`, `worker_effort=max`, `claude_worker=haiku`; c `/config`
  `codex_reviewer=astra` under the installed id; d c plus env `CXC_REVIEW_MODEL=sol`. Record `M` and the effort variable
  each block ends with. The resolver uses the real Codex catalog (no model call).

## Method
Subject: `plugins/peer-coding` at the product commit in `runs/PRODUCT`, copied to `subject/peer-coding/` with a sha256
list before the first case and verified on every run; never edited here. `run.py` is state-aware (DONE skipped,
incomplete refused). Temporary homes and repositories only; every child runs with `CXC_MODE=off` except where the case
says. Host paths are not redacted (because-i-needed root CLAUDE.md Rule 9, 2026-09-30).

## Metrics
Elapsed ms per subprocess; tokens as each CLI reports them (Claude `usage`, Codex `turn.completed` usage), else "not
measured". No arms; deltas N/A.
