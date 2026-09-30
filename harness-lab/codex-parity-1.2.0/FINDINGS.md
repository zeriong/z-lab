# Codex setting parity findings

## H04 — Generated hook setup preserves configuration

The shared nine-test suite exercises `install-hooks.py` on both host layouts. It keeps unrelated settings/hooks, supports dry-run, removes only duplicate owned declarations, preserves bytes on a no-op rerun, executes from a nested path containing spaces, and rejects a malformed second target before writing either. A differing custom hook is retained unless explicit replacement is requested.

## H05 — Read-only source injection

A real read-only Codex process invoked the installed fixture hook once. Both generated sentinel bodies reached `additionalContext` with exit 0. macOS Python emitted xcrun cache permission diagnostics; they did not prevent the JSON result. This verifies direct execution, not hook trust or runtime activation.

## H06 — Generated review instructions are self-contained

A scoped real generator produced an eleven-phase workflow with all four reviewer variables, concrete project-local paths, two separate read-only CLI commands, `CXC_MODE=off`, JSON output shape, per-reviewer 3.5 threshold and three-iteration cap. It did not need to refer to the build skill's Phase 6.2. Specimen: `runs/workflow/specimen/draft/harness-engineering/SKILL.md`. No future reviewers were run in this narrow generation probe.

## Follow-up and limits

The older bundled asset and generated specimen omitted the project-rules body during bypass despite the existing README promise. Those specimens remain unchanged. The correction is measured separately in `../codex-bypass-1.2.0/` (H07); final packaging uses that corrected source. The generated specimen has fixed fixture defaults and does not establish settings resolution in a later session with another model. Full derivation/review was previously exercised in `codex-compat-1.2.0-full-access/`, not repeated for every project here.
