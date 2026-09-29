# Host: Codex

You are a Codex model. Your vendor is OpenAI.

## Main
Run as `gpt-6-sol` at high effort, or `gpt-6-astra` for large or high-risk features.

## Reaching each lane

| Lane | Standalone transport | Orca transport |
|---|---|---|
| `claude-fast` | `claude -p` (see transport-standalone.md) | Orca worker, agent `claude`, `--model ${CXC_CLAUDE_WORKER:-sonnet}` |
| `codex-bulk` | Codex subagent or `codex exec -m ${CXC_WORKER_MODEL}` | Orca worker, agent `codex`, `--model ${CXC_WORKER_MODEL:-gpt-6-luna}` |
| `main` | yourself | yourself |

Check the other vendor with `command -v claude`. If missing → single-vendor mode.

## Review routing, resolved for this host

Note how this differs from the Claude Code host: here *you* are the natural reviewer
for Claude-authored work, and Luna work needs a Claude reviewer.

| Author | Reviewer |
|---|---|
| `claude-fast` (Sonnet) | **you** — different vendor, so no extra reviewer needed |
| `main` (you) | Claude `${CXC_CLAUDE_REVIEWER:-opus}`, read-only |
| `codex-bulk` (Luna) | Claude `${CXC_CLAUDE_REVIEWER:-opus}`, read-only |
| High-risk final | Claude Opus at max effort, read-only |

Single-vendor mode: reviewer is a fresh `CXC_FINAL_MODEL` instance, read-only, given
only `plan.md`, `decisions.md`, and the diff.

## Native context
You read `AGENTS.override.md` / `AGENTS.md` and Codex config natively, and `CLAUDE.md`
only if it is listed in `project_doc_fallback_filenames`. Claude workers and reviewers
read `CLAUDE.md` and `.claude/` instead — bridge them per `context-bridge.md`. If the
repo is Claude-first (rich `.claude/`, thin or no `AGENTS.md`), you are the one missing
context: read `CLAUDE.md` and the relevant `.claude/` files yourself before planning.

## Host notes
- Because Luna and you share a vendor, don't let "Main reviews worker output" become
  the default here — it would be same-vendor review. Your own task gate (tests, scope
  check) still applies to Luna work; only the phase review goes to Claude.
- Claude runs through its CLI's print mode; it has no memory of this session. The
  delegation prompt must be fully self-contained.
- The plugin's prompt hook runs in `claude -p` sessions too; start Claude workers and
  reviewers with `CXC_MODE=off`.
