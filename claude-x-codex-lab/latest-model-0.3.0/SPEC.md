# claude-x-codex 0.3.0 — every dispatch runs the newest model of its family

Frozen before running, 2026-09-30. Codex CLI 0.159.0, Claude Code 2.1.284, macOS.

## Objective
Measure the wired skill, not the resolver alone (that is `plugin-platform-lab/latest-model-0.159.0/`
and `latest-model-r2-0.159.0/`): the command forms exactly as `skills/run/references/transport-standalone.md`
writes them, and the real `run` skill followed by a Codex main agent.

## Cases
- W01 Documented forms, as written. Extract the four blocks (Codex worker, Codex reviewer, Claude worker,
  Claude reviewer) from the subject's transport-standalone.md and run each with bash, substituting only
  the placeholders (`<plugin>`, `<feature>`, `<id>`, `<phase>`, `<n>`), in a fixture repository whose
  task worktree comes from the file's Worktrees block. Settings: `CXC_WORKER_MODEL=gpt-5.6-luna`,
  `CXC_REVIEW_MODEL=gpt-6-sol`, `CXC_CLAUDE_WORKER=claude-sonnet-5-5`, `CXC_CLAUDE_REVIEWER` unset, efforts
  `low`/`low` to keep the runs small. Tasks are trivial (create one file; review a one-line diff).
  Record each block's exit, the resolver's stderr note, and the id that ran (Codex run header `model:`,
  Claude `modelUsage`).
- W02 Stop paths of the same forms: the Codex worker block with an empty `CODEX_HOME`, and the Claude worker
  block with `ANTHROPIC_DEFAULT_SONNET_MODEL` set. Record exit, stderr, and whether the child CLI started
  (its log / raw output file exists).
- W03 The real skill on a Codex main agent started on an older model: `codex exec -m gpt-6-sol` in a fixture
  (workspace-write, ephemeral, user config ignored) told to follow `<subject>/skills/run/SKILL.md` for an
  explicitly requested orchestration of a trivial task, perform Setup and the "Newest model per family"
  step only, and stop before dispatching. Record the commands it ran, the ids it reports for main, the
  `codex-bulk` worker, the Codex reviewer and the Claude reviewer, whether it tells the user its own
  session is older than the newest `sol`, and what happens if the resolver fails inside its sandbox.

## Method
Subject: `plugins/claude-x-codex` as released, copied to `subject/claude-x-codex/` with a sha256 manifest
before the first case; never edited here. `run.py` is state-aware (DONE skipped, incomplete refused).
Temporary fixtures and homes only; no persistent user setting changes. Host paths are not redacted
(root CLAUDE.md Rule 9, 2026-09-30).

## Metrics
Elapsed ms per subprocess; CLI-reported tokens (Codex `tokens used`, Claude `usage`), else "not measured".
Deltas N/A.

## Decision
User decisions (2026-09-30): versioned settings raised to the newest of the family; all four plugins;
stop and tell the user when the newest cannot be determined.
