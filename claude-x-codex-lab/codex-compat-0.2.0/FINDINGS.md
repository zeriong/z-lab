# Findings

## C01 — Real audit skill
Codex ran the actual bundled context-audit script, reported both .claude/settings.json and .codex/hooks.json and the uncommitted context gap, and explained that a Claude reviewer reviews a Codex main author. The audit wrote only its report and allowed local exclude entry. Exit 0; 77,342 ms. It did not execute a full cross-vendor implementation workflow.

## C02 — Context and mode script regression
The final platform tests exercise on/off state, prompt-toggle exclusion, structured ON output and unchanged repository bytes during the source audit script. Codex project hook declarations are reported without claiming runtime activation.

## C03 — Plain stdout was not delivered
Both saved Codex prompt-hook probes returned ABSENT despite mode on. The diagnostic probe captured the real shell hook invocation, CXC_MODE=on, script ON output, and another ABSENT model response. This disproved an environment-variable explanation and motivated a structured additionalContext candidate. Original failed probes are preserved. The follow-up is ../codex-mode-json-0.2.0/, not a replacement of these specimens.

## Not measured

No comparison of model quality, broad platform portability, published remote installation, or complete browser/device coverage is claimed. Agent fixtures are smoke tests. Source snapshots retain the pre-bump metadata used at run time; final native package versions are measured in plugin-platform-lab/codex-final-0.158.0.
