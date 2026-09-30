# claude-x-codex 0.3.0 — a Codex main that cannot see its own model id

Frozen before running, 2026-09-30. Codex CLI 0.159.0, macOS. Sibling of `latest-model-0.3.0/`: its W03 main
(started on `gpt-6-sol`) resolved its lanes correctly but could not see its own id and did not tell the user
its session was older. The Codex adapters then gained one sentence: when the own id is not visible, resolve
the setting's family or `sol`, and tell the user once that the session model is unconfirmed.

## Cases
- W04 Same prompt, fixture and command as W03 (`codex exec -m gpt-6-sol`, workspace-write, ephemeral, user
  config ignored; Setup and "Newest model per family" only, no dispatch), on the subject after that sentence
  was added. Record the commands it ran, the ids it reports, and whether it tells the user that its session
  model is unconfirmed or older.

## Method
Subject: `plugins/claude-x-codex` at the time of this run, copied to `subject/claude-x-codex/` with a sha256
manifest before the case. The runner is the sibling's `run.py` with W04 = W03's function. One-shot agent run;
temporary fixture only. Host paths not redacted.

## Metrics
Elapsed ms; CLI-reported tokens. Delta against W03: N/A (one run each; not a comparison).

## Decision
Same user decisions as the sibling.
