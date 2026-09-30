# Newest model per family — CLI facts (Codex 0.159.0, Claude Code 2.1.284)

Evidence: [latest-model-0.159.0](../../latest-model-0.159.0/FINDINGS.md) (L01–L07),
[r2](../../latest-model-r2-0.159.0/FINDINGS.md) (L04r, L06r, L07r, L08), [r3](../../latest-model-r3-0.159.0/FINDINGS.md)
(L08i, L09, L02i), [r4](../../latest-model-r4-0.159.0/FINDINGS.md) (L02x).

- Observation: only the refreshed catalog (`codex debug models`) names the newest (`gpt-6.1-sol`); a failed refresh
  still exits 0 and prints the bundled catalog, so the cache metadata (`models_cache.json`) is the only proof of a
  refresh (L01, L03). The CLI refreshes after (294.4, 304.4] s (L02x). A sandboxed shell has no network and cannot
  refresh (L09, L08i). Claude aliases run the CLI's latest model but `ANTHROPIC_DEFAULT_<FAMILY>_MODEL` redirects
  them, from the environment or a settings file (L05, L06).
- Action: one resolver, `scripts/latest-model.py`, shipped identically in the four plugins.
- Review history: the first write-up misreported L02's bound and L08's condition and claimed an unrecorded
  network fact (review LAB-1…LAB-3); corrected in place and re-measured in r3/r4, never by editing a specimen.

## Decisions (not measurements)

- User, 2026-09-30: every dispatched model is the newest version of its family that the installed CLI and
  account offer; upgrading the CLIs is the user's job, choosing the newest they offer is the plugin's.
- User, 2026-09-30: a versioned setting (e.g. `gpt-6-sol`) is raised to its family's newest; no pinning
  exception.
- User, 2026-09-30: when the newest cannot be determined, the step stops and tells the user; no fallback to a
  fixed or bundled version.
- User, 2026-09-30: the rule covers all four plugins.
- Main, 2026-09-30: `CACHE_MAX_AGE_SECONDS = 315` — a margin over the measured refresh bound (r4 L02x).
- Main, 2026-09-30 (from W03/N01, revised after review P2-4): a Codex main that cannot see its own model id
  resolves its own family if it knows it; otherwise, with the role's setting unset, it stops before dispatch and
  asks for the setting — guessing `sol` would change an astra/luna session's role family.
