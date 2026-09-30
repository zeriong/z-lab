# Context parity audit
repo: /private<fixture>

## 1. Instructions

| dir | CLAUDE.md | AGENTS.md | parity |
|---|---|---|---|
| . | missing | untracked | ok (Claude Code falls back to AGENTS.md) |

## 2. Vendor configuration

| path | vendor | state |
|---|---|---|
| .claude/settings.json | claude | untracked |
| .claude/settings.local.json | claude | missing |
| .claude/skills | claude | missing |
| .claude/agents | claude | missing |
| .claude/commands | claude | missing |
| .claude/rules | claude | missing |
| .mcp.json | claude | missing |
| .codex | codex (project) | untracked |
| .codex/config.toml | codex (project) | missing |
| .codex/hooks.json | codex (project) | untracked |
| .agents | codex (project) | missing |
| .agents/skills | codex (project) | missing |
| <home>/Library/Application Support/orca/codex-accounts/<run-id>/home/config.toml | codex (user) | present; project_doc_fallback_filenames: unset |
| <home>/Library/Application Support/orca/codex-accounts/<run-id>/home/cxc-*.config.toml | codex (user profiles) | none |

## 3. Hooks (enforcement that may bind only one vendor)

| file | event | matcher | command |
|---|---|---|---|
| .claude/settings.json | UserPromptSubmit | * | echo CLAUDE-FIXTURE |
| .codex/hooks.json | UserPromptSubmit | * | echo CODEX-FIXTURE |

.claude hooks apply to Claude; .codex hooks apply to Codex after hook trust.
Declarations do not prove runtime activation. Classify each: enforcement → move its check
into a shared gate script; context injection → cover it in the context pack;
convenience → ignore.

## 4. Not committed → missing in worker worktrees

- .claude/ (untracked)
- .codex/ (untracked)

Ignored top-level entries (candidates for knowledge-tool output, e.g. code graphs):

Add the ones workers need to .claude-x-codex/context-manifest (policy: skills/run/references/context-bridge.md).
