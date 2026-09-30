# Newest model per family — the architecture and gate reviewers and generated projects (1.3.0)

Evidence: [latest-model-1.3.0](../../latest-model-1.3.0/FINDINGS.md) (M01, M02); CLI facts and the resolver:
[plugin-platform-lab analysis](../../../plugin-platform-lab/analyze/v0.159.0/latest-model.md).

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
