# Findings — harness 1.3.0 generated projects resolve the newest model

Codex CLI 0.159.0, macOS, 2026-09-30. Subject: `subject/harness/` (sha256 list in `subject/MANIFEST.sha256`).
Raw records: `runs/<case>/`; numbers: `METRICS.md`.

## Measured

- **M01 — the installer puts the resolver into the project.** On fresh fixtures for `--host claude`, `codex`
  and `both`, `install-hooks.py` exited 0 for `--dry-run`, install, `--check` and a second install. It wrote
  `.<host>/scripts/latest-model.py` for each installed host — executable and byte-identical to the plugin's
  `scripts/latest-model.py` — next to the hook and host settings, and nothing else. `--dry-run` listed the
  resolver among the changes; `--check` after the second install listed no changes.
- **M02 — the generated recipe resolves the newest.** The project-local command exactly as
  `skills/build/references/host-codex.md` writes it, run in the codex fixture with
  `HARNESS_CODEX_ARCH_MODEL=gpt-6-sol`, printed `gpt-6.1-sol` with `using gpt-6.1-sol (newest sol) instead of
  gpt-6-sol`; a read-only `codex exec` with that id ran `gpt-6.1-sol` (run header; 2,636 tokens).

## Not measured

- A full `$harness:build` run, so whether a real build copies this recipe into the generated
  harness-engineering skill (left out for cost: earlier builds used 0.75–1.7 M input tokens).
- The Claude-side generated review panel (Opus/Sonnet aliases) and its alias-override check.
