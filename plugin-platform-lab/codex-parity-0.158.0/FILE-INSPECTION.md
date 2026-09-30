# File inspection coverage

All 94 current repository files in Git or the pending addition list are inventoried below (81 plugin files). 78 were tracked at HEAD. Counts: modified=55, new=16, unchanged=23.

Inspection means the recorded scope, not exhaustive execution of every path or revalidation of historical research. Runtime checks use only disposable fixtures. No source or lab commits were made.

| File | Change | Inspection |
|---|---|---|
| `.claude-plugin/marketplace.json` | modified | JSON parsed; plugin manifests/catalog loaded by actual host validators/runtime; review schema preserved. |
| `.gitattributes` | unchanged | Repository/packaging instructions and preservation diff reviewed. |
| `.gitignore` | modified | Repository/packaging instructions and preservation diff reviewed. |
| `AGENTS.md` | new | Repository/packaging instructions and preservation diff reviewed. |
| `CLAUDE.md` | modified | Repository/packaging instructions and preservation diff reviewed. |
| `LICENSE` | unchanged | Repository/packaging instructions and preservation diff reviewed. |
| `README.ja.md` | modified | All links and version strings checked; Codex setup/settings sections reviewed across five languages. Historical empirical claims not re-measured. |
| `README.ko.md` | modified | All links and version strings checked; Codex setup/settings sections reviewed across five languages. Historical empirical claims not re-measured. |
| `README.md` | modified | All links and version strings checked; Codex setup/settings sections reviewed across five languages. Historical empirical claims not re-measured. |
| `README.zh-CN.md` | modified | All links and version strings checked; Codex setup/settings sections reviewed across five languages. Historical empirical claims not re-measured. |
| `README.zh-TW.md` | modified | All links and version strings checked; Codex setup/settings sections reviewed across five languages. Historical empirical claims not re-measured. |
| `install.sh` | modified | Shell source reviewed and bash syntax checked; source fixtures exercised except real-device mobile capture. |
| `plugins/claude-x-codex/.claude-plugin/plugin.json` | modified | JSON parsed; plugin manifests/catalog loaded by actual host validators/runtime; review schema preserved. |
| `plugins/claude-x-codex/.codex-plugin/plugin.json` | new | JSON parsed; plugin manifests/catalog loaded by actual host validators/runtime; review schema preserved. |
| `plugins/claude-x-codex/.gitattributes` | unchanged | Repository/packaging instructions and preservation diff reviewed. |
| `plugins/claude-x-codex/CHANGELOG.md` | new | Current release entry reviewed; historical entries preserved rather than re-measured. |
| `plugins/claude-x-codex/CLAUDE.md` | modified | Repository/packaging instructions and preservation diff reviewed. |
| `plugins/claude-x-codex/README.ja.md` | modified | All links and version strings checked; Codex setup/settings sections reviewed across five languages. Historical empirical claims not re-measured. |
| `plugins/claude-x-codex/README.ko.md` | modified | All links and version strings checked; Codex setup/settings sections reviewed across five languages. Historical empirical claims not re-measured. |
| `plugins/claude-x-codex/README.md` | modified | All links and version strings checked; Codex setup/settings sections reviewed across five languages. Historical empirical claims not re-measured. |
| `plugins/claude-x-codex/README.zh-CN.md` | modified | All links and version strings checked; Codex setup/settings sections reviewed across five languages. Historical empirical claims not re-measured. |
| `plugins/claude-x-codex/README.zh-TW.md` | modified | All links and version strings checked; Codex setup/settings sections reviewed across five languages. Historical empirical claims not re-measured. |
| `plugins/claude-x-codex/hooks/hooks.json` | unchanged | JSON parsed; plugin manifests/catalog loaded by actual host validators/runtime; review schema preserved. |
| `plugins/claude-x-codex/hooks/mode-context.sh` | modified | Shell source reviewed and bash syntax checked; source fixtures exercised except real-device mobile capture. |
| `plugins/claude-x-codex/scripts/context-audit.sh` | modified | Shell source reviewed and bash syntax checked; source fixtures exercised except real-device mobile capture. |
| `plugins/claude-x-codex/scripts/mode.sh` | modified | Shell source reviewed and bash syntax checked; source fixtures exercised except real-device mobile capture. |
| `plugins/claude-x-codex/scripts/worktree-setup.sh` | unchanged | Shell source reviewed and bash syntax checked; source fixtures exercised except real-device mobile capture. |
| `plugins/claude-x-codex/skills/audit/SKILL.md` | modified | Workflow, invocation policy, installed paths, tool/agent dispatch and host mapping reviewed; actual host discovery verified. |
| `plugins/claude-x-codex/skills/mode/SKILL.md` | modified | Workflow, invocation policy, installed paths, tool/agent dispatch and host mapping reviewed; actual host discovery verified. |
| `plugins/claude-x-codex/skills/mode/agents/openai.yaml` | new | Agent role or invocation policy reviewed; shared role bodies preserved, Codex dispatch documented/tested in scoped probes. |
| `plugins/claude-x-codex/skills/run/SKILL.md` | modified | Workflow, invocation policy, installed paths, tool/agent dispatch and host mapping reviewed; actual host discovery verified. |
| `plugins/claude-x-codex/skills/run/references/context-bridge.md` | modified | Host dependencies, shared workflow contracts and referenced resources reviewed; unchanged libraries compared byte-for-byte. |
| `plugins/claude-x-codex/skills/run/references/host-claude-code.md` | unchanged | Host dependencies, shared workflow contracts and referenced resources reviewed; unchanged libraries compared byte-for-byte. |
| `plugins/claude-x-codex/skills/run/references/host-codex.md` | modified | Host dependencies, shared workflow contracts and referenced resources reviewed; unchanged libraries compared byte-for-byte. |
| `plugins/claude-x-codex/skills/run/references/review.schema.json` | unchanged | JSON parsed; plugin manifests/catalog loaded by actual host validators/runtime; review schema preserved. |
| `plugins/claude-x-codex/skills/run/references/templates.md` | unchanged | Host dependencies, shared workflow contracts and referenced resources reviewed; unchanged libraries compared byte-for-byte. |
| `plugins/claude-x-codex/skills/run/references/transport-orca.md` | unchanged | Host dependencies, shared workflow contracts and referenced resources reviewed; unchanged libraries compared byte-for-byte. |
| `plugins/claude-x-codex/skills/run/references/transport-standalone.md` | unchanged | Host dependencies, shared workflow contracts and referenced resources reviewed; unchanged libraries compared byte-for-byte. |
| `plugins/harness/.claude-plugin/plugin.json` | modified | JSON parsed; plugin manifests/catalog loaded by actual host validators/runtime; review schema preserved. |
| `plugins/harness/.codex-plugin/plugin.json` | new | JSON parsed; plugin manifests/catalog loaded by actual host validators/runtime; review schema preserved. |
| `plugins/harness/CHANGELOG.md` | new | Current release entry reviewed; historical entries preserved rather than re-measured. |
| `plugins/harness/CLAUDE.md` | modified | Repository/packaging instructions and preservation diff reviewed. |
| `plugins/harness/README.ja.md` | modified | All links and version strings checked; Codex setup/settings sections reviewed across five languages. Historical empirical claims not re-measured. |
| `plugins/harness/README.ko.md` | modified | All links and version strings checked; Codex setup/settings sections reviewed across five languages. Historical empirical claims not re-measured. |
| `plugins/harness/README.md` | modified | All links and version strings checked; Codex setup/settings sections reviewed across five languages. Historical empirical claims not re-measured. |
| `plugins/harness/README.zh-CN.md` | modified | All links and version strings checked; Codex setup/settings sections reviewed across five languages. Historical empirical claims not re-measured. |
| `plugins/harness/README.zh-TW.md` | modified | All links and version strings checked; Codex setup/settings sections reviewed across five languages. Historical empirical claims not re-measured. |
| `plugins/harness/skills/build/SKILL.md` | modified | Workflow, invocation policy, installed paths, tool/agent dispatch and host mapping reviewed; actual host discovery verified. |
| `plugins/harness/skills/build/assets/inject-context.sh` | new | Shell source reviewed and bash syntax checked; source fixtures exercised except real-device mobile capture. |
| `plugins/harness/skills/build/references/host-codex.md` | new | Host dependencies, shared workflow contracts and referenced resources reviewed; unchanged libraries compared byte-for-byte. |
| `plugins/harness/skills/build/references/workflow.md` | new | Host dependencies, shared workflow contracts and referenced resources reviewed; unchanged libraries compared byte-for-byte. |
| `plugins/harness/skills/build/scripts/install-hooks.py` | new | Python parsed; source reviewed; applicable deterministic fixture suite executed. |
| `plugins/plan-smith/.claude-plugin/plugin.json` | modified | JSON parsed; plugin manifests/catalog loaded by actual host validators/runtime; review schema preserved. |
| `plugins/plan-smith/.codex-plugin/plugin.json` | new | JSON parsed; plugin manifests/catalog loaded by actual host validators/runtime; review schema preserved. |
| `plugins/plan-smith/CHANGELOG.md` | modified | Current release entry reviewed; historical entries preserved rather than re-measured. |
| `plugins/plan-smith/CLAUDE.md` | modified | Repository/packaging instructions and preservation diff reviewed. |
| `plugins/plan-smith/README.ja.md` | modified | All links and version strings checked; Codex setup/settings sections reviewed across five languages. Historical empirical claims not re-measured. |
| `plugins/plan-smith/README.ko.md` | modified | All links and version strings checked; Codex setup/settings sections reviewed across five languages. Historical empirical claims not re-measured. |
| `plugins/plan-smith/README.md` | modified | All links and version strings checked; Codex setup/settings sections reviewed across five languages. Historical empirical claims not re-measured. |
| `plugins/plan-smith/README.zh-CN.md` | modified | All links and version strings checked; Codex setup/settings sections reviewed across five languages. Historical empirical claims not re-measured. |
| `plugins/plan-smith/README.zh-TW.md` | modified | All links and version strings checked; Codex setup/settings sections reviewed across five languages. Historical empirical claims not re-measured. |
| `plugins/plan-smith/agents/plan-writer.md` | unchanged | Agent role or invocation policy reviewed; shared role bodies preserved, Codex dispatch documented/tested in scoped probes. |
| `plugins/plan-smith/scripts/split-check.py` | unchanged | Python parsed; source reviewed; applicable deterministic fixture suite executed. |
| `plugins/plan-smith/skills/forge/SKILL.md` | modified | Workflow, invocation policy, installed paths, tool/agent dispatch and host mapping reviewed; actual host discovery verified. |
| `plugins/plan-smith/skills/forge/references/frames.md` | unchanged | Host dependencies, shared workflow contracts and referenced resources reviewed; unchanged libraries compared byte-for-byte. |
| `plugins/plan-smith/skills/forge/references/host-codex.md` | new | Host dependencies, shared workflow contracts and referenced resources reviewed; unchanged libraries compared byte-for-byte. |
| `plugins/plan-smith/skills/forge/references/packet-template.md` | modified | Host dependencies, shared workflow contracts and referenced resources reviewed; unchanged libraries compared byte-for-byte. |
| `plugins/plan-smith/skills/forge/references/split.md` | unchanged | Host dependencies, shared workflow contracts and referenced resources reviewed; unchanged libraries compared byte-for-byte. |
| `plugins/plan-smith/skills/forge/references/styles.md` | unchanged | Host dependencies, shared workflow contracts and referenced resources reviewed; unchanged libraries compared byte-for-byte. |
| `plugins/ux-ui/.claude-plugin/plugin.json` | modified | JSON parsed; plugin manifests/catalog loaded by actual host validators/runtime; review schema preserved. |
| `plugins/ux-ui/.codex-plugin/plugin.json` | new | JSON parsed; plugin manifests/catalog loaded by actual host validators/runtime; review schema preserved. |
| `plugins/ux-ui/CHANGELOG.md` | new | Current release entry reviewed; historical entries preserved rather than re-measured. |
| `plugins/ux-ui/CLAUDE.md` | modified | Repository/packaging instructions and preservation diff reviewed. |
| `plugins/ux-ui/README.ja.md` | modified | All links and version strings checked; Codex setup/settings sections reviewed across five languages. Historical empirical claims not re-measured. |
| `plugins/ux-ui/README.ko.md` | modified | All links and version strings checked; Codex setup/settings sections reviewed across five languages. Historical empirical claims not re-measured. |
| `plugins/ux-ui/README.md` | modified | All links and version strings checked; Codex setup/settings sections reviewed across five languages. Historical empirical claims not re-measured. |
| `plugins/ux-ui/README.zh-CN.md` | modified | All links and version strings checked; Codex setup/settings sections reviewed across five languages. Historical empirical claims not re-measured. |
| `plugins/ux-ui/README.zh-TW.md` | modified | All links and version strings checked; Codex setup/settings sections reviewed across five languages. Historical empirical claims not re-measured. |
| `plugins/ux-ui/agents/ux-ui-art-director.md` | unchanged | Agent role or invocation policy reviewed; shared role bodies preserved, Codex dispatch documented/tested in scoped probes. |
| `plugins/ux-ui/agents/ux-ui-mobile-art-director.md` | unchanged | Agent role or invocation policy reviewed; shared role bodies preserved, Codex dispatch documented/tested in scoped probes. |
| `plugins/ux-ui/hooks/hooks.json` | unchanged | JSON parsed; plugin manifests/catalog loaded by actual host validators/runtime; review schema preserved. |
| `plugins/ux-ui/scripts/mobile-snapshot.sh` | unchanged | Shell source reviewed and bash syntax checked; source fixtures exercised except real-device mobile capture. |
| `plugins/ux-ui/scripts/ui-commit-gate.sh` | modified | Shell source reviewed and bash syntax checked; source fixtures exercised except real-device mobile capture. |
| `plugins/ux-ui/skills/build-mobile/SKILL.md` | modified | Workflow, invocation policy, installed paths, tool/agent dispatch and host mapping reviewed; actual host discovery verified. |
| `plugins/ux-ui/skills/build-mobile/references/backend-detection.md` | modified | Host dependencies, shared workflow contracts and referenced resources reviewed; unchanged libraries compared byte-for-byte. |
| `plugins/ux-ui/skills/build-mobile/references/mobile-design-principles.md` | unchanged | Host dependencies, shared workflow contracts and referenced resources reviewed; unchanged libraries compared byte-for-byte. |
| `plugins/ux-ui/skills/build-mobile/references/mobile-measurement-protocol.md` | unchanged | Host dependencies, shared workflow contracts and referenced resources reviewed; unchanged libraries compared byte-for-byte. |
| `plugins/ux-ui/skills/build-mobile/references/mobile-review-rubric.md` | unchanged | Host dependencies, shared workflow contracts and referenced resources reviewed; unchanged libraries compared byte-for-byte. |
| `plugins/ux-ui/skills/build/SKILL.md` | modified | Workflow, invocation policy, installed paths, tool/agent dispatch and host mapping reviewed; actual host discovery verified. |
| `plugins/ux-ui/skills/build/references/design-principles.md` | modified | Host dependencies, shared workflow contracts and referenced resources reviewed; unchanged libraries compared byte-for-byte. |
| `plugins/ux-ui/skills/build/references/host-codex.md` | new | Host dependencies, shared workflow contracts and referenced resources reviewed; unchanged libraries compared byte-for-byte. |
| `plugins/ux-ui/skills/build/references/measurement-protocol.md` | modified | Host dependencies, shared workflow contracts and referenced resources reviewed; unchanged libraries compared byte-for-byte. |
| `plugins/ux-ui/skills/build/references/review-rubric.md` | unchanged | Host dependencies, shared workflow contracts and referenced resources reviewed; unchanged libraries compared byte-for-byte. |
| `tests/test_compatibility.py` | new | Python parsed; source reviewed; applicable deterministic fixture suite executed. |
