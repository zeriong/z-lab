# Re-review file coverage

95 repository files, including 82 plugin files. Every current file has a hash; changed code, settings and docs were re-inspected. Unchanged source uses the prior scoped inspection plus the current runtime/regression checks. This is not a re-execution of every historical experiment.

| File | Changed since prior review | Coverage |
|---|---|---|
| `.claude-plugin/marketplace.json` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `.gitattributes` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `.gitignore` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `AGENTS.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `CLAUDE.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `LICENSE` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `README.ja.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `README.ko.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `README.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `README.zh-CN.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `README.zh-TW.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `install.sh` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/claude-x-codex/.claude-plugin/plugin.json` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/claude-x-codex/.codex-plugin/plugin.json` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/claude-x-codex/.gitattributes` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/claude-x-codex/CHANGELOG.md` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/claude-x-codex/CLAUDE.md` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/claude-x-codex/README.ja.md` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/claude-x-codex/README.ko.md` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/claude-x-codex/README.md` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/claude-x-codex/README.zh-CN.md` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/claude-x-codex/README.zh-TW.md` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/claude-x-codex/hooks/hooks.json` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/claude-x-codex/hooks/mode-context.sh` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/claude-x-codex/scripts/context-audit.sh` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/claude-x-codex/scripts/mode.sh` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/claude-x-codex/scripts/worktree-setup.sh` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/claude-x-codex/skills/audit/SKILL.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/claude-x-codex/skills/mode/SKILL.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/claude-x-codex/skills/mode/agents/openai.yaml` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/claude-x-codex/skills/run/SKILL.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/claude-x-codex/skills/run/references/context-bridge.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/claude-x-codex/skills/run/references/host-claude-code.md` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/claude-x-codex/skills/run/references/host-codex.md` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/claude-x-codex/skills/run/references/review.schema.json` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/claude-x-codex/skills/run/references/templates.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/claude-x-codex/skills/run/references/transport-orca.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/claude-x-codex/skills/run/references/transport-standalone.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/harness/.claude-plugin/plugin.json` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/harness/.codex-plugin/plugin.json` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/harness/CHANGELOG.md` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/harness/CLAUDE.md` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/harness/README.ja.md` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/harness/README.ko.md` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/harness/README.md` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/harness/README.zh-CN.md` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/harness/README.zh-TW.md` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/harness/skills/build/SKILL.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/harness/skills/build/assets/inject-context.sh` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/harness/skills/build/references/host-codex.md` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/harness/skills/build/references/workflow.md` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/harness/skills/build/scripts/install-hooks.py` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/plan-smith/.claude-plugin/plugin.json` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/plan-smith/.codex-plugin/plugin.json` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/plan-smith/CHANGELOG.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/plan-smith/CLAUDE.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/plan-smith/README.ja.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/plan-smith/README.ko.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/plan-smith/README.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/plan-smith/README.zh-CN.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/plan-smith/README.zh-TW.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/plan-smith/agents/plan-writer.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/plan-smith/scripts/split-check.py` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/plan-smith/skills/forge/SKILL.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/plan-smith/skills/forge/references/frames.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/plan-smith/skills/forge/references/host-codex.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/plan-smith/skills/forge/references/packet-template.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/plan-smith/skills/forge/references/split.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/plan-smith/skills/forge/references/styles.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/ux-ui/.claude-plugin/plugin.json` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/ux-ui/.codex-plugin/plugin.json` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/ux-ui/CHANGELOG.md` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/ux-ui/CLAUDE.md` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/ux-ui/README.ja.md` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/ux-ui/README.ko.md` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/ux-ui/README.md` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/ux-ui/README.zh-CN.md` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/ux-ui/README.zh-TW.md` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/ux-ui/agents/ux-ui-art-director.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/ux-ui/agents/ux-ui-mobile-art-director.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/ux-ui/hooks/hooks.json` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/ux-ui/scripts/commit-roots.py` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/ux-ui/scripts/mobile-snapshot.sh` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/ux-ui/scripts/ui-commit-gate.sh` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/ux-ui/skills/build-mobile/SKILL.md` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/ux-ui/skills/build-mobile/references/backend-detection.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/ux-ui/skills/build-mobile/references/mobile-design-principles.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/ux-ui/skills/build-mobile/references/mobile-measurement-protocol.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/ux-ui/skills/build-mobile/references/mobile-review-rubric.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/ux-ui/skills/build/SKILL.md` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
| `plugins/ux-ui/skills/build/references/design-principles.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/ux-ui/skills/build/references/host-codex.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/ux-ui/skills/build/references/measurement-protocol.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `plugins/ux-ui/skills/build/references/review-rubric.md` | False | Byte-identical to previous file inspection; host dependencies and existing evidence reconsidered. |
| `tests/test_compatibility.py` | True | Current diff/source and affected contracts re-reviewed; runtime, regression or documentation checks as described in FINDINGS.md. |
