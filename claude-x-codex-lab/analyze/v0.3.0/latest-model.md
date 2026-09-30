# Newest model per family — claude-x-codex 0.3.0

Evidence: [latest-model-0.3.0](../../latest-model-0.3.0/FINDINGS.md) (W01–W03),
[latest-model-0.3.0-own-id](../../latest-model-0.3.0-own-id/FINDINGS.md) (W04); CLI facts and the resolver:
[plugin-platform-lab analysis](../../../plugin-platform-lab/analyze/v0.159.0/latest-model.md).

- Observation: 0.2.0 pinned `gpt-6-luna` / `gpt-6-sol` / `gpt-6-astra` while the account already listed
  `gpt-6.1-sol`. The documented forms now resolve before every call (W01) and start no child when resolution
  fails (W02). A Codex main on an older model resolves its lanes correctly but cannot see its own id (W03, W04).
- Action: settings name a family; `scripts/latest-model.py` runs before each dispatch; the id that ran is taken
  from the run; plugin paths in commands are quoted (review P2-1).
- Not measured: a full orchestration run under the rule; a Codex main escalating the resolver out of its
  sandbox (the cache stayed fresh here); Orca workers (both starts in this feature failed at agent readiness).

## Decisions (not measurements)

- User, 2026-09-30: newest version of each family; versioned settings raised; stop and tell the user when the
  newest cannot be determined; all four plugins. Main: `CACHE_MAX_AGE_SECONDS = 315` (plugin-platform r4 L02x).
