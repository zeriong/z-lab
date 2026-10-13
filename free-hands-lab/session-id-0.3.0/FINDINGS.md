# Findings — how each host identifies a session to its hooks (free-hands 0.3.0 pre-build)

Claude Code 2.1.296, Codex CLI 0.162.1 (`runs/V00`), macOS, 2026-10-13. Raw records: `runs/<case>/` (`probe.jsonl`
holds every hook input the probe received); numbers: `METRICS.md` (21 calls, all exit 0; Claude 0.94 USD). n=1 per
case. The account's `auth.json` hash was the same before and after every Codex case; the temporary home was deleted.
Deviation: see SPEC "Deviations recorded after freezing" (a runner crash before any measured call).

## Measured

- **S01 — Every hook event carries `session_id` on both hosts, and it is the host's own session id.** Claude: SessionStart,
  UserPromptSubmit, PreToolUse, PostToolUse, Stop, SubagentStart, SubagentStop and PreCompact all carried the `system/init`
  `session_id` (cA1–cA7). Codex: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop carried the
  `thread.started` `thread_id` as `session_id` (xA1–xA6), plus `turn_id` and `model`.
- **S02 — Resume and compaction keep the id.** Claude `--resume <id>` (cA2), `--continue` (cA3) and `--resume <id>` +
  `/compact` (cA4: PreCompact, then SessionStart `source: compact`) all reported cA1's id; SessionStart said
  `source: resume`. Codex `exec resume <id>` (xA2) and `exec resume --last` (xA3) reported xA1's id with `source: resume`.
  Claude `--session-id <uuid>` set the id to that uuid (cA7). Separate fresh sessions got different ids (cA1, cA5, cA6;
  xA1, xA5, xA6).
- **S03 — A subagent's hook events carry the parent's id, plus agent fields.** Claude Agent tool (cA5): the subagent's
  PreToolUse/PostToolUse for `echo from-subagent` carried the parent's `session_id` and `agent_id`, `agent_type:
  general-purpose`; SubagentStart/SubagentStop the same. Codex `collaboration.spawn_agent` (xA5): the child's
  PreToolUse/PostToolUse for `echo from-subagent` carried the parent's `session_id` and `agent_id`, `agent_type:
  default`. Claude's compaction also ran as a subagent (cA4: SubagentStop with `agent_type: ""`).
- **S04 — Environment variables are not a safe source of the id.** Claude set `CLAUDE_CODE_SESSION_ID` to its own id in
  hook processes and in the agent's shell (cA1 tool result). Codex hook processes had no `CODEX_*` id variable; the
  agent's shell had `CODEX_SESSION_ID` and `CODEX_THREAD_ID` equal to the thread id (xA1). Both Codex hooks and the Codex
  shell also carried `CLAUDE_CODE_SESSION_ID` of the Claude session that started the runner — a variable inherited from
  an outer process names the wrong session.
- **S05 — `UserPromptSubmit` receives the typed skill command.** Claude `prompt: "/fh-probe:noop hello"` (cA6), Codex
  `prompt: "$fh-probe:noop hello"` (xA6); both skills then ran (replies "noop hello").

## Not measured

- Interactive TUI sessions (all runs were `claude -p` / `codex exec`); two sessions running at the same moment (only
  separate fresh sessions were compared); Codex compaction; hooks trusted through `/hooks`.
- Whether the free-hands guard built on these facts behaves as intended — that is the 0.3.0 run that follows.

## Decision input (SPEC "Decision")

- Owner key: hook input `session_id` on both hosts (S01), never an environment variable (S04).
- Resume and compaction keep ownership without a take-over step (S02).
- Limiting the guard, including the hard-limit shell hook, to the owner's id still covers the owner's subagents on both
  hosts (S03); Codex panel children are separate `codex exec` sessions with their own ids and keep `FREE_HANDS_ROLE`.
- The prompt hook can recognise `/free-hands:run` and `$free-hands:run` by their text (S05).
