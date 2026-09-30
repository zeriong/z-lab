# Re-review findings

## C07 — Host routing contradicted configurable reviewer settings

The shared run skill and transports resolve CXC_REVIEW_MODEL, CXC_CLAUDE_REVIEWER and CXC_REVIEW_EFFORT, but host tables still selected fixed model/effort names in several rows. Both host adapters now explicitly resolve settings and aliases, including the single-vendor path. This is a correction of contradictory instructions; transport CLI arguments were already configurable and remain unchanged.

## C08 — A filename mention was mistaken for context parity

The negative fixture says `Do not read CLAUDE.md` in AGENTS.md. The old audit incorrectly reported `ok (pointer)`. The corrected audit reports CHECK, requiring direction and contents to be verified. A fallback mention also requires effective profile/project confirmation rather than proving runtime parity. Read-only behavior and malformed-hook diagnostics remain covered by the shared suite.

Limits: no claim of semantic equivalence for arbitrary instructions, no new full cross-vendor run or quality ranking.
