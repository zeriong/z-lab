# Newest model per family — refresh window and sandbox, measured precisely

Frozen before running, 2026-09-30. Codex CLI 0.159.0, macOS. Sibling of `latest-model-0.159.0/` (L02) and
`latest-model-r2-0.159.0/` (L08), after review LAB-1…LAB-3: L02 bounded the window from file mtimes in a
home other processes also wrote; L08(c) used a fresh copy instead of the failed home; the network claim
had no record.

## Cases
- L09 Network in the sandbox. `python3 -c` opening `https://chatgpt.com` with a 5 s timeout, once inside
  `codex sandbox` (default policy) and once outside. Exit and the full error text.
- L08i Same home. A temporary `CODEX_HOME` with copies of the account's `auth.json`, `config.toml` and
  `models_cache.json`, the cache's `fetched_at` moved back 10 min. In that one home, in order: the shipped
  resolver `codex sol` inside `codex sandbox`, then the same command outside the sandbox. Record exit,
  stdout, stderr and `fetched_at` before and after each step. Record whether the real `auth.json`'s sha256
  is unchanged afterwards (the hash only, never the content).
- L02i Refresh window. On the account's `CODEX_HOME`, with no other Codex process started by this session
  during the case: `codex debug models` every 10 s for 8 min (48 calls). For each call record UTC start and
  end (`time.time()`), and the cache's `fetched_at` and `etag` just before and just after. A call
  *refreshed* the cache when the after-`fetched_at` lies inside its [start, end]; a call *served* the cache
  when before and after are equal. Report the largest start-age served and the smallest start-age refreshed,
  and any `fetched_at` change outside our calls (another writer).

## Method
Subject: the shipped resolver (sha256 `4fdb8206…`, as in r2), copied to `subject/latest-model.py` with
`subject/SHA256`. State-aware `run.py`. Credentials are copied only into a temporary home that is deleted
after L08i. No persistent user setting is modified. Host paths are not redacted.

## Metrics
Elapsed ms per subprocess; no model calls, so no tokens. Deltas N/A.

## Decision
If L02i bounds the window below 315 s, the resolver keeps 315 as the upper bound (a decision recorded with
its reason); if L02i finds a larger window, the constant moves to that bound in a new release step.
