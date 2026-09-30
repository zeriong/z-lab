# Findings

## H01 — Protected directories are a real boundary
The real skill ran in Codex workspace-write mode. Writes to .codex/.agents were refused. The agent generated staged artifacts and reported installation pending; it did not broaden permissions or claim an installed harness. The original source and AGENTS.md were preserved. Its direct verification record contains 34 checks; two independent reviews completed. Scores are workflow evidence, not model-quality measurements.

## H02 — Injection fixture
The final platform run's deterministic tests copy the actual bundled injection source into Claude and Codex layouts. Both inject the two skill bodies from a nested cwd, strip YAML, recognize five bypass phrases, report missing files and tolerate malformed input. No target-project runtime activation is inferred from direct script execution.

## H03 — Shared Claude contract
Claude output paths and Opus/Sonnet panel remain in the skill; Codex maps paths and uses two fresh read-only reviewers. The missing private dependency was replaced with a public workflow synthesized from published requirements, not private source. This run is not an end-to-end Claude generation or existing-config merge test.

## Not measured

No comparison of model quality, broad platform portability, published remote installation, or complete browser/device coverage is claimed. Agent fixtures are smoke tests. Source snapshots retain the pre-bump metadata used at run time; final native package versions are measured in plugin-platform-lab/codex-final-0.158.0.
