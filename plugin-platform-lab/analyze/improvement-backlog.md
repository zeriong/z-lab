# Improvement backlog



## Codex compatibility 0.158.0

- Evidence: [version analysis](v0.158.0/codex-compatibility.md).
- Observation: discovery alone did not translate host tool APIs, paths or hook delivery.
- Action: share core definitions, add host adapters and verify runtime behavior.
- Decision: preserve existing Claude semantics; do not replace panel models based on this smoke test.
- Remaining measurement: complete browser/mobile and broader project coverage; no claim yet.

## Codex setting parity 0.158.0

- Evidence and decisions: [version analysis](v0.158.0/codex-setting-parity.md).
- State: local implementation and the scoped verification are complete; no publication.
- Further measurements: broader end-to-end browser/device coverage and alternate-model dispatch; no quality equivalence claim.

## Codex full re-review

- Evidence: [P06/P07](v0.158.0/codex-rereview.md).
- Observation: happy-path regression success missed filename handling and reusable configuration defects.
- Correction: add adversarial source fixtures and keep direct runtime/installation evidence separate from document consistency checks.

## Newest model per family (Codex 0.159.0)

- Evidence: [version analysis](v0.159.0/latest-model.md) (L01–L09, L02x).
- Observation: a pinned slug kept `gpt-6-sol` while `gpt-6.1-sol` was listed; exit status cannot prove a catalog refresh.
- Action: shared resolver with cache verification, alias-override refusal and stop-on-failure.
- Remaining measurement: Linux/WSL, other Claude override channels, access-restricted models.

## Claude Code hooks modules beside Codex command hooks (2.1.299)

- Evidence: [mod-dual-host-2.1.299](../mod-dual-host-2.1.299/FINDINGS.md) (M01–M07), [mod-interactive-2.1.299](../mod-interactive-2.1.299/FINDINGS.md) (I01–I05).
- Observation: Claude runs `hooks/hooks.json` and a manifest `hooks` path both and ignores the Codex manifest; Codex rejects
  a hooks file naming `modules` and reads its manifest `hooks` path. A module reaches settings, files, processes and the
  rate-limit windows, draws above the prompt, asks through the engine's dialog and sees subagents' calls; free-hands 0.3.0's
  ask guard blocked that dialog.
- Action: layout C for dashboard and budget; free-hands 0.4.0 lets budget's question through.
- Remaining measurement: installs through a Claude marketplace; desktop and IDE surfaces.

