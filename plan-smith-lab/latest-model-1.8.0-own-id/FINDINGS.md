# Findings — plan-smith 1.8.0 writer model when the Codex main cannot see its own id

Codex CLI 0.159.0, macOS, 2026-09-30. Subject: `subject/plan-smith/` (sha256 list in `subject/MANIFEST.sha256`),
after review P2-4's adapter change and before P2-5 reordered its wording (with `PLAN_SMITH_CODEX_MODEL` unset, as
here, both wordings lead to the same branches). Raw records: `runs/N03/`.

## Measured

- **N03 — the main took the "own family" branch.** Started with `-m gpt-6-sol`, the main passed `gpt-6.1-sol` to
  the resolver (`latest-model.py codex gpt-6.1-sol --effort medium` → `gpt-6.1-sol`) and spawned the writer with
  model `gpt-6.1-sol`; the only model id in its events is `gpt-6.1-sol` (14 mentions). It did not stop to ask for
  `PLAN_SMITH_CODEX_MODEL`: it treated its family as known (`sol`), while naming its session model as the newest
  `sol` — as the Codex worker's self-report did twice in this feature. It noted in the packet that the writer's id
  came from the spawn call, not from a run header. The writer wrote the plan (196 words). 396.1 s, 1,221,446 input
  tokens (1,182,464 cached).

## Not measured

- The stop-and-ask branch (a main that knows neither its id nor its family).
- A main on a family other than `sol`.
