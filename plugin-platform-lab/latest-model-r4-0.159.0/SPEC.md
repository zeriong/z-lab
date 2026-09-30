# Newest model per family — refresh window in an isolated home

Frozen before running, 2026-09-30. Codex CLI 0.159.0, macOS. Sibling of `latest-model-r3-0.159.0/`, whose
L02i could not bound the window because another process refreshed the shared `CODEX_HOME` every 1–3 min.

## Cases
- L02x A temporary `CODEX_HOME` holding copies of the account's `auth.json`, `config.toml` and a freshly
  refreshed `models_cache.json` (one `codex debug models` in that home first). Then `codex debug models`
  every 10 s for 7 min (42 calls). Per call: UTC start and end, the cache's `fetched_at`/`etag` before and
  after. *Refreshed* = after-`fetched_at` inside [start, end]; *served* = unchanged. Report the largest
  start-age served, the smallest start-age refreshed, and any change outside our calls. Afterwards record
  whether the real `auth.json` hash is unchanged (hash only).

## Method
Subject: the shipped resolver (sha256 `4fdb8206…`) is not run here; `subject/` is kept for the series'
convention. State-aware `run.py`. The temporary home is deleted after the case. Host paths not redacted.

## Metrics
Elapsed ms per call; no tokens. Deltas N/A.

## Decision
`CACHE_MAX_AGE_SECONDS` stays 315 if the measured window is at most 315 s; otherwise it moves to the
measured bound.
