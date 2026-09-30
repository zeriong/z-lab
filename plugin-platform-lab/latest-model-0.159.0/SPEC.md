# Newest model per family — CLI facts and resolver

Frozen before running, 2026-09-30. Codex CLI 0.159.0, Claude Code 2.1.284, macOS.

## Objective
The four because-i-needed plugins will dispatch the newest version of each model family the
installed CLI and account offer, through one resolver script (`scripts/latest-model.py`,
identical in every plugin). Measure the CLI behavior that resolver relies on, and the
resolver itself on the real catalog and the real CLIs. Wiring into the skills is measured
separately, per plugin series.

## Cases
- L01 Catalog sources. On the account's real `CODEX_HOME`: `codex debug models` and
  `codex debug models --bundled`, 3 runs each. Record exit, elapsed ms, listed slugs, the
  newest listed slug per `gpt-<version>-<family>` family, and `models_cache.json`'s
  `fetched_at`, `etag`, `client_version` before and after each call.
- L02 Refresh window. Call `codex debug models` at t = 0 and then every 60 s for 20 min
  (21 calls). Record `fetched_at` after each call. The window is the interval after which
  a call rewrites `fetched_at`; if no rewrite happens within 20 min, the window is
  "> 20 min" and not otherwise bounded.
- L03 Refresh failure. (a) `CODEX_HOME` = an empty directory; (b) `CODEX_HOME` = a directory
  holding only a copy of the real `models_cache.json` with `fetched_at` moved back 2 days
  and no credentials. For each: exit, whether stdout equals `--bundled`, whether it equals
  the copied cache, and whether the cache file changed.
- L04 Resolver on the real catalog. Inputs: codex `sol`, `luna`, `astra`, `terra`,
  `gpt-6-sol`, `gpt-5.6-luna`, `gpt-5.5`, `o3`; codex `sol --effort xhigh`,
  `luna --effort ultra`; claude `opus`, `sonnet`, `claude-opus-5-5`, `opus --effort xhigh`,
  `opus --effort ultra`. Record stdout, stderr, exit, elapsed ms.
- L05 Resolved ids run. For each L04 codex success of `sol`, `luna`, `astra`:
  `CXC_MODE=off codex exec -m <resolved> -c model_reasoning_effort=low -s read-only
  --ephemeral "Reply with the single word OK." < /dev/null`, and once more for `sol` at
  `xhigh`. For claude `opus`, `sonnet`: `CXC_MODE=off claude -p "Reply with the single word
  OK." --model <resolved> --effort low --output-format json < /dev/null`. Record exit, the
  run header's `model:` (Codex) or `modelUsage` keys (Claude), elapsed ms, reported tokens.
- L06 Claude alias override. (a) `ANTHROPIC_DEFAULT_SONNET_MODEL=claude-haiku-4-5-20251001`
  in the environment; (b) the same key in the `env` object of a temporary project's
  `.claude/settings.json`, run from that project. For each: the `claude -p --model sonnet`
  run's `modelUsage` keys, and the resolver's exit and stderr for `claude sonnet` with the
  same override.
- L07 Resolver failure on the real machine. `PATH` without `codex`; `CODEX_HOME` = empty
  directory. Record exit, stdout, stderr.

## Method
The subject is the resolver as merged from task T1, copied to `subject/latest-model.py`
with its sha256 in `subject/SHA256` before the first case runs; it is never edited here.
`run.py` is state-aware: a case directory holding `DONE` is skipped, an incomplete one is
refused, and a changed condition gets a new sibling experiment. Each case writes
`runs/<case>/` with the exact commands, raw stdout/stderr, exit codes and `metrics.json`.
Agent runs are one-shot, read-only, with trivial prompts; they establish that an id runs,
not model quality. No persistent user setting is modified: temporary homes and projects
only. Host paths need not be redacted (root CLAUDE.md Rule 9, 2026-09-30).

## Metrics
Elapsed ms = monotonic end minus start. Tokens = CLI-reported usage, else "not measured".
Delta = 100 × (candidate − baseline) / baseline only for comparable nonzero baselines;
otherwise N/A. `METRICS.md` is generated from `runs/*/metrics.json`.

## Decision
User decisions (2026-09-30): a versioned setting is raised to the newest of its family;
the rule covers all four plugins; when the newest cannot be determined, the lane stops and
the user is told. Main's decision: the resolver's `CACHE_MAX_AGE_SECONDS` comes from L02.
