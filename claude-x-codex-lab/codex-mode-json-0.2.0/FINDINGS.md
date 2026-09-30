# Findings

## C04 — Structured context reaches both hosts
The real changed hook emits UserPromptSubmit hookSpecificOutput.additionalContext. Codex returned ON_PRESENT. Claude returned ON_PRESENT with mode on and ABSENT with mode off. All three processes exited 0; no implementation or commits were requested. Direct script tests separately confirm Codex off-mode silence and toggle-command exclusion. There was no separate Codex runtime off-mode probe.

The note's workflow remains unchanged; the transport and host-neutral toggle wording changed. This is one specimen per final host/mode condition, not a reliability-rate or token-efficiency comparison.

## Not measured

No comparison of model quality, broad platform portability, published remote installation, or complete browser/device coverage is claimed. Agent fixtures are smoke tests. Source snapshots retain the pre-bump metadata used at run time; final native package versions are measured in plugin-platform-lab/codex-final-0.158.0.
