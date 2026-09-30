# Existing-file coverage audit

This follow-up reads every file tracked at HEAD and compares its bytes with the working tree. It checks JSON parsing, shell/Python syntax and literal Markdown links where applicable. This is a structural/compatibility audit, not proof of full semantic review or end-to-end execution for all files.

78 existing files: 51 changed, 27 byte-identical to HEAD. No missing bundled Markdown link found. Three links in split.md point to generated output examples (parts/overview_A0.md, parts/schema_B0.md, ../plan.md); those files correctly do not exist in the plugin. All JSON and applicable script syntax checks passed.

| Existing file | Change | Check |
|---|---|---|
| `.claude-plugin/marketplace.json` | changed | readable UTF-8, compared with HEAD, valid JSON |
| `.gitattributes` | unchanged | readable UTF-8, compared with HEAD, byte-identical to original |
| `.gitignore` | changed | readable UTF-8, compared with HEAD |
| `CLAUDE.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `LICENSE` | unchanged | readable UTF-8, compared with HEAD, byte-identical to original |
| `README.ja.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `README.ko.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `README.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `README.zh-CN.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `README.zh-TW.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `install.sh` | changed | readable UTF-8, compared with HEAD, Bash syntax 0 |
| `plugins/claude-x-codex/.claude-plugin/plugin.json` | changed | readable UTF-8, compared with HEAD, valid JSON |
| `plugins/claude-x-codex/.gitattributes` | unchanged | readable UTF-8, compared with HEAD, byte-identical to original |
| `plugins/claude-x-codex/CLAUDE.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/claude-x-codex/README.ja.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/claude-x-codex/README.ko.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/claude-x-codex/README.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/claude-x-codex/README.zh-CN.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/claude-x-codex/README.zh-TW.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/claude-x-codex/hooks/hooks.json` | unchanged | readable UTF-8, compared with HEAD, valid JSON, byte-identical to original |
| `plugins/claude-x-codex/hooks/mode-context.sh` | changed | readable UTF-8, compared with HEAD, Bash syntax 0 |
| `plugins/claude-x-codex/scripts/context-audit.sh` | changed | readable UTF-8, compared with HEAD, Bash syntax 0 |
| `plugins/claude-x-codex/scripts/mode.sh` | unchanged | readable UTF-8, compared with HEAD, Bash syntax 0, byte-identical to original |
| `plugins/claude-x-codex/scripts/worktree-setup.sh` | unchanged | readable UTF-8, compared with HEAD, Bash syntax 0, byte-identical to original |
| `plugins/claude-x-codex/skills/audit/SKILL.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/claude-x-codex/skills/mode/SKILL.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/claude-x-codex/skills/run/SKILL.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/claude-x-codex/skills/run/references/context-bridge.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/claude-x-codex/skills/run/references/host-claude-code.md` | unchanged | readable UTF-8, compared with HEAD, byte-identical to original, local link scan |
| `plugins/claude-x-codex/skills/run/references/host-codex.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/claude-x-codex/skills/run/references/review.schema.json` | unchanged | readable UTF-8, compared with HEAD, valid JSON, byte-identical to original |
| `plugins/claude-x-codex/skills/run/references/templates.md` | unchanged | readable UTF-8, compared with HEAD, byte-identical to original, local link scan |
| `plugins/claude-x-codex/skills/run/references/transport-orca.md` | unchanged | readable UTF-8, compared with HEAD, byte-identical to original, local link scan |
| `plugins/claude-x-codex/skills/run/references/transport-standalone.md` | unchanged | readable UTF-8, compared with HEAD, byte-identical to original, local link scan |
| `plugins/harness/.claude-plugin/plugin.json` | changed | readable UTF-8, compared with HEAD, valid JSON |
| `plugins/harness/CLAUDE.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/harness/README.ja.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/harness/README.ko.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/harness/README.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/harness/README.zh-CN.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/harness/README.zh-TW.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/harness/skills/build/SKILL.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/plan-smith/.claude-plugin/plugin.json` | changed | readable UTF-8, compared with HEAD, valid JSON |
| `plugins/plan-smith/CHANGELOG.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/plan-smith/CLAUDE.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/plan-smith/README.ja.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/plan-smith/README.ko.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/plan-smith/README.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/plan-smith/README.zh-CN.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/plan-smith/README.zh-TW.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/plan-smith/agents/plan-writer.md` | unchanged | readable UTF-8, compared with HEAD, byte-identical to original, local link scan |
| `plugins/plan-smith/scripts/split-check.py` | unchanged | readable UTF-8, compared with HEAD, Python syntax, byte-identical to original |
| `plugins/plan-smith/skills/forge/SKILL.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/plan-smith/skills/forge/references/frames.md` | unchanged | readable UTF-8, compared with HEAD, byte-identical to original, local link scan |
| `plugins/plan-smith/skills/forge/references/packet-template.md` | unchanged | readable UTF-8, compared with HEAD, byte-identical to original, local link scan |
| `plugins/plan-smith/skills/forge/references/split.md` | unchanged | readable UTF-8, compared with HEAD, byte-identical to original, local link scan |
| `plugins/plan-smith/skills/forge/references/styles.md` | unchanged | readable UTF-8, compared with HEAD, byte-identical to original, local link scan |
| `plugins/ux-ui/.claude-plugin/plugin.json` | changed | readable UTF-8, compared with HEAD, valid JSON |
| `plugins/ux-ui/CLAUDE.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/ux-ui/README.ja.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/ux-ui/README.ko.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/ux-ui/README.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/ux-ui/README.zh-CN.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/ux-ui/README.zh-TW.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/ux-ui/agents/ux-ui-art-director.md` | unchanged | readable UTF-8, compared with HEAD, byte-identical to original, local link scan |
| `plugins/ux-ui/agents/ux-ui-mobile-art-director.md` | unchanged | readable UTF-8, compared with HEAD, byte-identical to original, local link scan |
| `plugins/ux-ui/hooks/hooks.json` | unchanged | readable UTF-8, compared with HEAD, valid JSON, byte-identical to original |
| `plugins/ux-ui/scripts/mobile-snapshot.sh` | unchanged | readable UTF-8, compared with HEAD, Bash syntax 0, byte-identical to original |
| `plugins/ux-ui/scripts/ui-commit-gate.sh` | changed | readable UTF-8, compared with HEAD, Bash syntax 0 |
| `plugins/ux-ui/skills/build-mobile/SKILL.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/ux-ui/skills/build-mobile/references/backend-detection.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/ux-ui/skills/build-mobile/references/mobile-design-principles.md` | unchanged | readable UTF-8, compared with HEAD, byte-identical to original, local link scan |
| `plugins/ux-ui/skills/build-mobile/references/mobile-measurement-protocol.md` | unchanged | readable UTF-8, compared with HEAD, byte-identical to original, local link scan |
| `plugins/ux-ui/skills/build-mobile/references/mobile-review-rubric.md` | unchanged | readable UTF-8, compared with HEAD, byte-identical to original, local link scan |
| `plugins/ux-ui/skills/build/SKILL.md` | changed | readable UTF-8, compared with HEAD, local link scan |
| `plugins/ux-ui/skills/build/references/design-principles.md` | unchanged | readable UTF-8, compared with HEAD, byte-identical to original, local link scan |
| `plugins/ux-ui/skills/build/references/measurement-protocol.md` | unchanged | readable UTF-8, compared with HEAD, byte-identical to original, local link scan |
| `plugins/ux-ui/skills/build/references/review-rubric.md` | unchanged | readable UTF-8, compared with HEAD, byte-identical to original, local link scan |

## Correction to earlier preservation evidence

The earlier core-preservation.json used two nonexistent paths ending in `references/frames` and `references/styles`; an empty git diff for those paths was not valid preservation evidence. This audit uses the real `frames.md` and `styles.md` files, checks their existence, and compares complete bytes: both are unchanged. The older record is retained, with this correction rather than silently overwritten.

## Remaining limits

No claim of all-file line-by-line manual review, every environment, complete mobile/browser measurement or remote installation. Historical changelog and translations are included in content/links/diff checks; historical experiments were not repeated.
