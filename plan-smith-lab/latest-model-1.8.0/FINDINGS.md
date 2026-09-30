# Findings — plan-smith 1.8.0 writers run the newest model of the main session's family

Codex CLI 0.159.0, Claude Code 2.1.284, macOS, 2026-09-30. Subject: `subject/plan-smith/` (sha256 list in
`subject/MANIFEST.sha256`; its manifests still read 1.7.0 — the version bump comes after this experiment).
Raw records: `runs/<case>/`; numbers: `METRICS.md`.

## Measured

- **N01 — Codex host.** A main started with `-m gpt-6-sol` followed the real forge skill and adapter, ran the
  resolver (9 mentions in its events), and dispatched the writer as a native subagent with model
  `gpt-6.1-sol` and effort `medium`; the only model id in the event stream is `gpt-6.1-sol` (14 mentions). The
  plan was written by the writer (202 words). The packet recorded the writer as `gpt-6.1-sol` and the main
  agent's model as "unconfirmed": the main could not see its own id, and passed `gpt-6.1-sol` to the resolver
  instead of its session's id. A nested `codex exec` attempt from its sandbox failed to start (permission
  error); the native route worked. 360.7 s, 558,856 input tokens (520,448 cached).
- **N02 — Claude host.** A main on `opus` ran `latest-model.py claude claude-opus-5-5` (its own id) and called
  `plan-smith:plan-writer` with `model: "opus"`; `modelUsage` lists only `claude-opus-5-5`. 152.3 s, $1.01.
  The runner crashed while parsing this run's events (a string `content`); the summary was derived afterwards
  from the saved raw stdout without rerunning (`summary.json` says so), and `metrics.json` has no elapsed time
  for it — the duration above is the result event's `duration_ms`.

## Observed, unrelated to this change

- In N02 the main shortened the writer's plan to meet the prompt's word limit ("I cut wording only"), against
  forge's verbatim-relay contract.

## Not measured

- Relay mode, wiring audits and splits under the new rule (N01/N02 were single-pass decision plans).
- An older Claude main id: none was available to start from, so N02 shows the alias being passed, not a
  downgrade being corrected.
