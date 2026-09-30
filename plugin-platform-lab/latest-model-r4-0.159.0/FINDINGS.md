# Findings — refresh window in an isolated home

Codex CLI 0.159.0, macOS, 2026-09-30. Raw records: `runs/L02x/`; numbers: `METRICS.md`.

## Measured

- **L02x — the window lies in (294.4, 304.4] s, consistent with 300 s.** In a temporary `CODEX_HOME` nothing else wrote (no change outside our
  calls), 42 calls 10 s apart with recorded UTC start/end and the cache before and after: every call up to a
  start-age of 294.4 s served the cache (14–51 ms); the call at 304.4 s refreshed it itself (`fetched_at`
  inside its window, 396 ms); later calls served the new cache again. The account's real `auth.json` hash was
  unchanged afterwards. This bounds the window to (294.4, 304.4] s, consistent with L02's estimate.
  **Deviation from SPEC:** the SPEC asked for a freshly refreshed cache first; the warm call served the
  copied cache instead (16 ms), so call00 started at a cache age of 24.4 s. Each call's own start-age is
  recorded, so the bounds stand.

## Decision (not a measurement)

The resolver keeps `CACHE_MAX_AGE_SECONDS = 315`: a margin over the measured 304.4 s, so a cache the CLI
still serves never stops a lane; after a failed refresh it accepts a real catalog at most 315 s old. Only the
resolver's comment changed after r2/r3 froze their subject (code identical, checked with `diff` ignoring
comment lines).

## Not measured

- Whether the window differs by platform, CLI version or account.
