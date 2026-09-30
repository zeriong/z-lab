# Findings — claude-x-codex 0.3.0 dispatches the newest model of each family

Codex CLI 0.159.0, Claude Code 2.1.284, macOS, 2026-09-30. Subject: `subject/claude-x-codex/` (sha256 list in
`subject/MANIFEST.sha256`). Raw records: `runs/<case>/`; numbers: `METRICS.md`.

## Measured

- **W01 — the documented forms run the newest.** The four blocks of `transport-standalone.md`, run with bash
  as written (placeholders substituted) and older or versioned settings: the Codex worker (`gpt-5.6-luna`)
  ran `gpt-6-luna`; the Codex reviewer (`gpt-6-sol`) ran `gpt-6.1-sol` (run headers); the Claude worker
  (`claude-sonnet-5-5`) ran with the alias and `modelUsage` showed `claude-sonnet-5-5`; the Claude reviewer
  (default `opus`) ran `claude-opus-5-5`. Each versioned setting printed its
  `using <newest> … instead of <setting>` note. All four exited 0.
- **W02 — stop paths start no child.** The Codex worker block with an empty `CODEX_HOME` exited 2 with
  `no models_cache.json … catalog not refreshed …` and wrote no worker log; the Claude worker block with
  `ANTHROPIC_DEFAULT_SONNET_MODEL` set exited 2 naming the variable and wrote no raw output.
- **W03 — a Codex main on an older model follows the rule for its lanes.** `codex exec -m gpt-6-sol` following
  the real skill ran the resolver for each role (24 mentions of `latest-model.py` in its events) and reported
  `gpt-6.1-sol` for main and the Codex reviewer, `gpt-6-luna` for `codex-bulk`, and `opus` for the Claude
  reviewer; it dispatched nothing, as asked (69.6 s, 156,067 input tokens). It did **not** tell the user that
  its own session ran an older model: it said it could not verify which model the session was. `orca status`
  failed inside its sandbox, so it fell back to the standalone transport.

## Not measured

- A full orchestration run (plan, dispatch, reviews) under the new rule on either host.
- A Codex main escalating the resolver out of its sandbox: the cache stayed fresh here (another process on
  this machine refreshes it every 1–3 min — plugin-platform-lab `latest-model-r3-0.159.0` L02i).
- Orca-started workers: `launch.effective` matched the requested `gpt-6-luna` twice in this feature's own run,
  but both starts failed at agent readiness (outside these cases).
- After this run, the Codex host adapter gained one sentence for a main that cannot see its own model id
  (from W03); its effect is measured in a sibling.
