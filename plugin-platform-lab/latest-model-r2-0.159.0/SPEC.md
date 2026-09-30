# Newest model per family — the shipped resolver, and inside a Codex sandbox

Frozen before running, 2026-09-30. Codex CLI 0.159.0, Claude Code 2.1.284, macOS.
Sibling of `latest-model-0.159.0/`, whose subject changed after it was frozen.

## Objective
Re-measure the resolver as it will ship — review fixes, Codex families open to any listed
`gpt-<version>-<word>`, `CACHE_MAX_AGE_SECONDS` = 315 from L02 — and measure what it does
inside a Codex sandbox, where a Codex main agent's shell runs with network and writes blocked
and the CLI cannot refresh its catalog.

## Cases
- L04r Same 15 inputs as L04, plus codex `nova` (a family not in the catalog). Record
  stdout, stderr, exit, elapsed ms.
- L06r The resolver half of L06: `claude sonnet` with `ANTHROPIC_DEFAULT_SONNET_MODEL` in
  (a) the environment, (b) a temporary project's `.claude/settings.json`; plus (c) that
  settings file made invalid JSON. Exit and stderr.
- L07r Same as L07 (no `codex` on `PATH`; empty `CODEX_HOME`).
- L08 Inside `codex sandbox` (default policy), with a temporary `CODEX_HOME` holding copies
  of the account's `auth.json`, `config.toml` and `models_cache.json`:
  (a) cache copied as is (fresh), resolver `codex sol` inside the sandbox;
  (b) cache `fetched_at` moved back 10 min, resolver `codex sol` inside the sandbox;
  (c) the same stale home, resolver `codex sol` outside the sandbox (control).
  For each: exit, stdout, stderr, and the cache's `fetched_at` before and after.
  Credentials are copied only into the temporary home, which is deleted after the case,
  and never into the records.

## Method
Subject: the shipped resolver copied to `subject/latest-model.py`, sha256 in
`subject/SHA256`, before the first case; never edited here. `run.py` is state-aware (DONE
skipped, incomplete refused). No persistent user setting is modified. Host paths are not
redacted (root CLAUDE.md Rule 9, 2026-09-30).

## Metrics
Elapsed ms = monotonic end minus start. No model calls, so no tokens. Deltas N/A.

## Decision
Same user decisions as the sibling. Main's decision: if L08(b) stops while L08(c) succeeds,
the Codex adapters tell a sandboxed main agent to rerun that one resolver command outside the
sandbox (the host's escalation route) before stopping the lane — measured on the real skill
in the plugin series' wired experiments.
