# Codex setting parity 1.7.0

Evidence: [findings](../../codex-parity-1.7.0/FINDINGS.md), [metrics](../../codex-parity-1.7.0/METRICS.md), [frozen specification](../../codex-parity-1.7.0/SPEC.md).

- Observation: a shared skill body alone does not map Claude tool names, model roles, output paths and hook activation to Codex.
- Decision: the maintainer chose native Codex role mapping with independently configurable model and reasoning effort. Defaults inherit the main session; CXC retains its cross-vendor route. This is a user decision, not a quality ranking.
- Implementation: preserve shared workflow contracts and give installed skills explicit host adapters and configuration instructions; retain measured script fixes.
- Scope: the attached findings distinguish actual execution from static configuration checks and unmeasured environments.
