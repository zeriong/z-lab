# Full re-review findings

## P06 — Prior passing tests were too narrow

All four plugins were re-reviewed. The preceding suite covered ordinary ASCII filenames and same-repository commits; it did not establish the edge contracts below. The initial re-review probes passed only 2/6 cases; corrected source passes 6/6. See the linked plugin findings for severity, mechanism and limits.

- [UX U06–U08](../../ux-ui-lab/codex-rereview-1.3.0/FINDINGS.md): filename/glob hashing, wrong commit worktree, approval location and JSON serialization.
- [Harness H08](../../harness-lab/codex-rereview-1.2.0/FINDINGS.md): generation-time model defaults and incompatible nested score values corrected; new real generated specimen inspected.
- [CXC C07/C08](../../claude-x-codex-lab/codex-rereview-0.2.0/FINDINGS.md): configured host routing and false-positive context parity.
- [Plan S04](../../plan-smith-lab/codex-rereview-1.7.0/FINDINGS.md): no additional defect found in the inspected contracts; source unchanged.

## P07 — Real isolated installation and repeat

The actual install.sh and Codex CLI installed all four plugins into a disposable configuration home from a local marketplace. Both initial and repeated installation exited 0; existing marketplace registration is idempotent on the measured CLI. This resolved the suspected repeat-install risk without a product change. No real user configuration or credentials were changed. The temporary cache was removed after the probe. No remote-network install or MCP startup was measured.

## Final checks

The authoritative final snapshot is runs/final-resolver-isolation: four native plugin reads, five Claude validators, eleven regression tests, eleven split self-tests, seven skill frontmatters, eight shell syntax checks, thirteen version locations per plugin and 415 README links pass. Python sources parse. Current hashes match that snapshot. The first runs/final predates the command-environment isolation correction and remains preserved. FILE-INSPECTION.md covers all current repository files.

No commits, staging, publication, browser/device completeness or model-quality equivalence is claimed. Literal commit inspection is not a general shell interpreter. Python 3.8+ is now required for the UI target resolver and approval serialization, with bootstrap and five-language README guidance.
