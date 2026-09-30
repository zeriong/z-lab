# Findings — newest model per family, CLI facts and resolver

Codex CLI 0.159.0, Claude Code 2.1.284, macOS, 2026-09-30. Subject: the first T1 resolver,
sha256 `413314e4…` (`subject/SHA256`). Raw records: `runs/<case>/`; numbers: `METRICS.md`.

## Measured

- **L01 — only the refreshed catalog names the newest.** On the account's `CODEX_HOME`,
  `codex debug models` (3/3, exit 0, 14–16 ms) listed `gpt-6.1-sol` as the newest `sol`;
  `--bundled` (3/3, 9–10 ms) listed `gpt-6-sol`. Newest per family on the live catalog:
  sol `gpt-6.1-sol`, luna `gpt-6-luna`, astra `gpt-6-astra`, terra `gpt-5.6-terra`.
  After each live call, `models_cache.json`'s slugs equalled the output's; after `--bundled`
  they did not. 14–16 ms means the live call served the cache without a network round trip.
- **L02 — refresh window, estimated.** Over 21 calls 60 s apart, a call served a cache
  254.9 s old unchanged. At call15 the previous `fetched_at` was 315.40 s before the new
  one, so the old cache was at least 314.85 s old when that call started (its 553 ms
  subtracted); the new `fetched_at` fell inside that call and it was the only slow one, so
  it most likely refreshed the cache itself — an inference, since other Codex processes
  wrote this `CODEX_HOME` too (the other eight changes came between our calls). Call start
  times come from file mtimes minus elapsed time, not from recorded clocks. Estimate:
  window in (254.9, ~314.9] s. r3's L02i could not bound it (another writer); `latest-model-r4-0.159.0/`
  (L02x) did: (294.4, 304.4] s.
  The output alternated between two byte-different catalogs (sha256 `b45b…`, `1bc9…`)
  with the same listed slugs, and `etag` changed with them (at t = 240, 300, 901, 1140 s).
- **L03 — a failed refresh is silent.** (a) Empty `CODEX_HOME`: exit 0, stdout identical
  to `--bundled`, no `gpt-6.1-sol`, no cache written. (b) A copy of the real cache moved
  back 2 days, no credentials: exit 0, stdout identical to `--bundled` — not the copied
  cache — and the cache file unchanged. Exit status and output shape cannot tell a
  refreshed catalog from the bundled one; the cache metadata can.
- **L04 — the resolver on the real catalog**, 15 inputs, 22–52 ms each: `sol` →
  `gpt-6.1-sol`, `luna` → `gpt-6-luna`, `astra` → `gpt-6-astra`, `terra` → `gpt-5.6-terra`;
  `gpt-6-sol` → `gpt-6.1-sol` and `gpt-5.6-luna` → `gpt-6-luna`, each with a stderr note;
  `gpt-5.5` and `o3` → exit 2; `sol --effort xhigh` → exit 0; `luna --effort ultra` → exit 3;
  Claude `opus`, `sonnet` → the aliases, `claude-opus-5-5` → `opus` with a note,
  `opus --effort xhigh` → exit 0, `opus --effort ultra` → exit 3.
- **L05 — resolved ids run.** `codex exec -m <resolved>`: `gpt-6.1-sol` (low and xhigh),
  `gpt-6-luna`, `gpt-6-astra` all exited 0 with the requested id in the run header
  (2,591–3,243 tokens, 6.0–8.8 s). `claude -p --model opus|sonnet` ran `claude-opus-5-5` and
  `claude-sonnet-5-5` (`modelUsage`).
- **L06 — Claude aliases can be redirected.** `ANTHROPIC_DEFAULT_SONNET_MODEL=claude-haiku-4-5-20251001`
  made `--model sonnet` run `claude-haiku-4-5-20251001`, both from the environment and from
  the `env` object of a project `.claude/settings.json`. The resolver exited 2 in both,
  naming the variable and where it was set.
- **L07 — failures stop.** No `codex` on `PATH` → exit 2; empty `CODEX_HOME` → exit 2 (no
  cache, so the bundled catalog was not accepted). stdout empty in both.

## Not measured

- Linux or WSL: the `fetched_at` fraction length there (the resolver now accepts more than
  6 digits; review T1-1), and every case above on those platforms.
- Other channels that can set `ANTHROPIC_DEFAULT_<FAMILY>_MODEL`: server-managed settings,
  OS-level managed preferences, a `--settings` file, `~/.claude/settings.local.json`. The
  resolver reads the environment and four settings files only.
- Models restricted by `available_access_programs`, and what `upgrade`/retirement does to a
  listed model's selection.
- The resolver running inside a Codex sandbox (network and writes blocked), where the CLI
  cannot refresh — measured in the sibling `latest-model-r2-0.159.0/` (L08).
- The resolver as finally shipped: it changed after this subject was frozen (review fixes,
  open Codex families, `CACHE_MAX_AGE_SECONDS` = 315 from L02). Re-measured in
  `latest-model-r2-0.159.0/`.
- Any model-quality difference between versions.
