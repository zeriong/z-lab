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
