# Findings

## H01 — Same workflow with authorized writable configuration
The outer test uses the source-editing session's full-access profile in a disposable fixture; all reviewer subprocesses remain read-only. The agent creates actual .codex/hooks.json, .codex/hooks/, .codex/scripts/ and .agents/skills/ paths. It preserves source and AGENTS.md and uses the bundled injection source. The transcript records two independent reviewers per iteration, with at most three iterations.

The reviewers found a generated gate's environment-failure exit code and the agent revised its own generated fixture within the workflow. The lab orchestrator did not edit that specimen. Direct injection succeeds in the outer fixture, but read-only reviewers cannot create Bash here-document temporary files; they report this constraint. Hook trust and runtime activation remain explicitly pending. The final two reviews reported zero findings, fact-check misses and gate evasions, with quality averages 4.67/5 and 4.50/5. The parent completed 23 direct checks and hash comparisons, then exited 0 after 1,114 seconds. These ratings are self-reported workflow gates, not comparative quality evidence. The final transcript and review artifacts preserve the results.

## H02/H03 — Scope
See the sibling restricted run and final platform test for deterministic injection and preserved Claude contracts. Read-only reviewer outcomes and model self-reported ratings are not a comparative quality result. No real target repository or global configuration was modified.

## Not measured

No comparison of model quality, broad platform portability, published remote installation, or complete browser/device coverage is claimed. Agent fixtures are smoke tests. Source snapshots retain the pre-bump metadata used at run time; final native package versions are measured in plugin-platform-lab/codex-final-0.158.0.
