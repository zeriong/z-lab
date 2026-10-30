# Findings — peer-coding 1.2.0 persistent model settings, measured as shipped

Claude Code 2.1.314, Codex CLI 0.166.0, macOS 27.0.1, 2026-10-30. Subject: `subject/peer-coding/` = because-i-needed
`2334564` (`runs/PRODUCT`; sha256 list in `subject/MANIFEST.sha256`). Raw records: `runs/<case>/`; numbers: `METRICS.md`.

## Measured

- **M01 — resolution order holds in all 16 combinations.** For `codex-reviewer`, with each of env (`gamma`), project
  (`terra`), `/config` under `peer-coding@because-i-needed` (`astra`) and global file (`luna`) present or absent, `get`
  returned the first present level in that order, else `sol`, 16/16, and `status --json` named the same store. A value
  under `peer-coding@inline` was read by the subject at its own path (`astra`) and ignored by the installed copy (`sol`).
- **M02 — the dashboard shows the models on both hosts.** The unchanged dashboard collector, given the subject, drew
  the same line for `--host claude` and `--host codex`: defaults `🛠peer workers: codex terra · claude sonnet · effort
  high   🔍peer reviewers: codex sol · claude opus · effort xhigh`; a project setting showed `codex astra · claude opus
  (project) · effort max`; a `/config` value showed `codex luna` (no level marker: `global`). The status commands took
  58–140 ms (five runs each, interpreter start included).
- **M03 — the `mode` skill sets and shows them on both hosts.** Claude Code (`claude-sonnet-5-5`): `/peer-coding:mode
  codex-reviewer astra` wrote `codex_reviewer=astra` to the project file and reported it effective; `/peer-coding:mode
  reviewer astra --global` mapped "reviewer" to `codex-reviewer`, wrote the global file, and passed on the script's
  note that the project value still wins; `/peer-coding:mode status` showed the mode and the six settings with sources.
  Codex (`gpt-6.1-sol` requested, `medium`): `$peer-coding:mode codex-worker luna` read the installed skill and ran the
  installed `settings.py set codex-worker luna` (exit 0; project file gained `codex_worker=luna`); `$peer-coding:mode
  status` ran the two status commands and showed `codex-worker luna project`. The login file's sha256 was unchanged
  and the temporary Codex home was removed.
- **M04 — the three standalone blocks it ran load the settings.** The Codex worker, Codex reviewer and Claude worker
  blocks of `transport-standalone.md` (each a subshell, the Claude one with its `cd` into a worktree) resolved: defaults
  → `gpt-6.1-terra` at `high`, `gpt-6.1-sol` at `xhigh`, `sonnet` at `high`; project `codex_worker=luna`,
  `worker_effort=max`, `claude_worker=haiku` → `gpt-6-luna` at `max` and `haiku` at `max`; `/config`
  `codex_reviewer=astra` → `gpt-6-astra`; plus env `CXC_REVIEW_MODEL=sol` → `gpt-6.1-sol`. All exit 0.

## Not measured

- The Claude reviewer block of `transport-standalone.md` and the Orca `worker-start` form: M04 ran the other three
  standalone blocks, each up to the resolved id (not the child CLI).
- A full orchestration run (plan, dispatch, review) on configured models end to end; M04 stops at the resolved id, and
  `../model-settings-probes-1.2.0/` P08 ran the worker and reviewer forms on terra and astra separately.
- The Codex child's own model id in M03 (it ran `$peer-coding:mode` only; `model_requested` is the resolver's output).
- `/config` changing a value inside a running session that then dispatches (P03 measured the menu's write; M01 the read).
- Any quality claim about `terra` as the default worker: a maintainer decision (`../analyze/improvement-backlog.md`).
