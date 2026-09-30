# Reproduction

Recorded versions: Codex CLI 0.158.0 and Claude Code 2.1.284. Run from the product checkout with z-lab as its sibling. Python 3 is required; runtime-checks additionally needs PyYAML. No persistent user settings are modified.

- `python3 <this-directory>/run-runtime-checks.py <product-checkout> <new-output-directory>`
- `python3 <this-directory>/run-agent-probes.py plan|hook|web|mobile`
- `python3 <this-directory>/run-web-review.py web-review`
- `python3 <this-directory>/run-workflow-probe.py`
- Bypass source checks: `python3 <lab>/harness-lab/codex-bypass-1.2.0/run-probe.py`

Agent/source runners skip DONE units and reject incomplete directories. Existing specimens must never be replaced. For a new attempt, copy the runner and freeze a new experiment/output location first. Runtime checks skip completed output; use a fresh location after any incomplete invocation.

The initial web capture runner timed out after producing its PNG. Its timeout was preserved, and the separate web-review runner consumes the same captured PNG without recapturing. Agent CLI records redact home, product, plugin and temporary fixture paths. Review processes are read-only; the plan writer can create designated planning artifacts. Tokens are CLI counters, not a model-quality comparison.
