# Structured prompt-hook context

Frozen before execution, 2026-09-29.

## Observation
Codex 0.158.0 invoked the plain-text mode hook and the script emitted the ON note, but the model reported no injected note in three probes. PreToolUse blocking worked. This is a runtime delivery discrepancy, not an environment-variable failure.

## Candidate
Emit the same note as UserPromptSubmit hookSpecificOutput.additionalContext JSON, supported by both host contracts. Keep off-mode silence and toggle-command exclusion.

## Checks
C04: In isolated Codex and Claude invocations, the real hook should deliver the note when on and remain silent when off. Capture hook output and model response separately. Do not run implementation or commit.

## Records
Preserve prior specimens; record elapsed milliseconds, CLI usage and unknown metrics as null. Completed units are not overwritten. No quality comparison is claimed.
