# Completion audit — 2026-09-30

Scope: inspect every plugin and supplement its skills for Codex with the same workflow, artifact, review and hook contracts, plus configurable native Codex role models and reasoning effort. Preserve existing Claude use. No commit or publication was requested.

| Requirement | Authoritative evidence | Result |
|---|---|---|
| Inspect all four plugins | [94-file inventory including 81 plugin files](FILE-INSPECTION.md); hashes match current checkout | Complete within the recorded inspection scope |
| Codex packaging and installation | [Actual runtime reads](runs/post-bypass/), [installer route/scope assertions](test_compatibility.py) | Four plugins and seven skills load; user scope |
| plan-smith contracts and role settings | [S03](../../plan-smith-lab/codex-parity-1.7.0/FINDINGS.md) | Explicit model/effort reaches a fresh writer |
| harness targets, reviewers and workflow | [H04–H06](../../harness-lab/codex-parity-1.2.0/FINDINGS.md), [prior full-generation run](../../harness-lab/codex-compat-1.2.0-full-access/FINDINGS.md) | Hook settings preserved; generated paths and independent review protocol explicit |
| harness bypass parity | [H07](../../harness-lab/codex-bypass-1.2.0/FINDINGS.md) | 14/14 cases; project-rules retained |
| UX web/mobile configuration and measurement/review/gate contracts | [U04/U05](../../ux-ui-lab/codex-parity-1.3.0/FINDINGS.md), image review, missing-mobile refusal, gate tests | Adapter/configuration complete; full browser/device matrix not exercised |
| CXC shared routing, mode and audit | [C05/C06](../../claude-x-codex-lab/codex-parity-0.2.0/FINDINGS.md), worktree/override/read-only assertions | Shared routing retained and source checks pass |
| Existing core resources preserved | [17 byte-identical resources](preserved-contracts.json) | Unchanged frames/styles/agents/rubrics/transports; changed scripts tested separately |
| Localized docs, versions and evidence | 25 READMEs, 415 links, 13 version locations per plugin; six experiment records plus analysis entries | Complete |
| Final validation describes current source | [Source hashes](runs/post-bypass/source-sha256.json), [all-file hashes](file-inspection.json); nine tests, eleven split cases, five validators | Hashes and results rechecked 2026-09-30 |
| Repository and evidence hygiene | Both Git indices empty and diff checks clean; report links, JSON/Python parsing and private-path scan clean | No commit or deployment |

## Explicit limits

Same workflow/settings support does not imply identical model outputs or quality. Not every frame or model/effort combination was run. UI adapters still require relevant browser/device/MCP capabilities; the mobile probe verifies missing-capture handling, not real-device capture. Users must trust their installed hooks. Local changes are not present at the remote Git URL until publication.

Audit correction: an initial preservation command named a nonexistent `references/pipeline.md` and stopped without writing a result. The final audit uses the actual `references/templates.md`; every listed path is verified against HEAD. This was a check-input error, not a product failure.
