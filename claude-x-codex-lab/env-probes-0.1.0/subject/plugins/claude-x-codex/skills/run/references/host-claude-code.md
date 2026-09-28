# Host: Claude Code

You are Claude. Your vendor is Anthropic.

## Main
Run as Opus. Use high effort for planning and triage; ordinary effort is fine for
task gates.

## Reaching each lane

| Lane | Standalone transport | Orca transport |
|---|---|---|
| `claude-fast` | Native subagent with model `${CXC_CLAUDE_WORKER:-sonnet}` | Orca worker, agent `claude`, `--model ${CXC_CLAUDE_WORKER:-sonnet}` |
| `codex-bulk` | `codex exec` (see transport-standalone.md) | Orca worker, agent `codex`, `--model ${CXC_WORKER_MODEL:-gpt-6-luna}` |
| `main` | yourself | yourself |

Check the other vendor with `command -v codex`. If missing → single-vendor mode.

## Review routing, resolved for this host

| Author | Reviewer |
|---|---|
| `claude-fast` (Sonnet) | Codex `CXC_REVIEW_MODEL`, read-only |
| `main` (you) | Codex `CXC_REVIEW_MODEL`, read-only |
| `codex-bulk` (Luna) | **you** — different vendor, so no extra reviewer needed |
| High-risk final | Codex `CXC_FINAL_MODEL`, read-only |

Single-vendor mode: reviewer is a fresh Opus subagent given only `plan.md`,
`decisions.md`, and the diff.

## Native context
You read `CLAUDE.md`, `.claude/` skills, rules, hooks and MCP natively (and `AGENTS.md`
in directories with no `CLAUDE.md`). Codex workers and reviewers read none of the
`CLAUDE.md` side unless it is bridged — follow `context-bridge.md`, and remember that
your hooks never fire on Codex-written code.

## Host notes
- Subagents return only their final message. Tell them to use the return format
  exactly; you don't see their intermediate reasoning.
- This plugin's `UserPromptSubmit` hook also fires in `claude -p` sessions. Start every
  CLI worker and reviewer with `CXC_MODE=off` so they don't receive the mode note.
- Pair with hooks (`PreToolUse`/`Stop`) for hard gates such as the cycle cap.
