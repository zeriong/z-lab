# free-hands 0.3.0 pre-build probe — how each host identifies a session to its hooks

Frozen before running, 2026-10-13. CLI versions recorded by V00.

## Why
A user ran free-hands in session A, opened a second terminal (session B) in the same repository and typed a prompt:
B picked up A's goal on its own and the shared `iterations` counter started rising. `guard.py` reads only
`<repo>/.free-hands/goal.md` and never looks at which session fired the hook (reproduced by feeding `guard.py` hook
input with another `session_id`: SessionStart and UserPromptSubmit injected the restore note, three Stops were blocked
and raised `iterations` 3→6). The planned fix records an owner session in the goal file and lets only the owner's
hooks act. Before building it, this probe measures what that design relies on.

## Questions
- Q1. Which hook events carry a session identifier, under which field, on each host, and what else they carry
  (`source`, `transcript_path`, agent fields).
- Q2. Does the identifier stay the same when the session is resumed by id, resumed as the most recent, or compacted
  (Claude `/compact`); does Claude's `--session-id <uuid>` set it.
- Q3. Do a subagent's hook events (Claude Agent tool, Codex native subagent) carry the parent's identifier or their own.
- Q4. Which environment variables naming a session or thread are visible to hooks and to the agent's shell commands.
- Q5. What `UserPromptSubmit` receives as `prompt` for a plugin skill command (`/fh-probe:noop hello`, `$fh-probe:noop
  hello`): the typed text or an expansion.

## Probe
A lab plugin `fh-probe` with one skill `noop` and hooks whose only command is `probe.py <event>`: it appends one JSON
line (the event name, the parsed hook input, and the environment entries whose names contain SESSION, THREAD or AGENT,
excluding names containing TOKEN, KEY, SECRET, AUTH or PASSWORD) to `<repo>/.probe/log.jsonl`, prints nothing and
exits 0. Claude events: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop, SubagentStart, SubagentStop,
PreCompact. Codex events: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop. No matcher.

## Isolation
- One scratch git repository per host under the temp directory; `.probe/` is git-ignored.
- Claude: `claude -p --plugin-dir <probe> --model sonnet --output-format stream-json --verbose --include-hook-events
  --permission-mode acceptEdits --allowedTools <listed per case>`, the account's login, `CXC_MODE=off`.
- Codex: one temporary `CODEX_HOME` shared by the Codex cases (resume needs the first case's session files) with a
  copy of the account's `auth.json` (sha256 of the original before/after) and the probe installed from a temporary
  local marketplace; `codex exec --json --dangerously-bypass-hook-trust -s workspace-write -C <repo>` and `codex exec
  resume … --json --dangerously-bypass-hook-trust -c sandbox_mode="workspace-write"` from the repo; the newest `luna`
  at `medium` (resolved by `latest-model.py`). The last step (CLEANUP) deletes the temporary home.

## Cases (n=1 each)
ENV = "Run exactly this shell command once and report its output: `env | grep -E '(SESSION|THREAD|AGENT)[A-Z_]*=' |
grep -vE '(TOKEN|KEY|SECRET|AUTH|PASSWORD)'; echo end`". OK = "Reply with the word ok."
- cA1 fresh session, ENV (Bash). cA2 `--resume <cA1 id>`, OK. cA3 `--continue`, OK. cA4 `--resume <cA1 id>`, `/compact`.
- cA5 fresh, Bash+Agent: "Use the Agent tool with subagent_type general-purpose. Tell the subagent to run exactly the
  shell command `echo from-subagent` with Bash and return its output. Then report that output."
- cA6 fresh, `/fh-probe:noop hello`. cA7 `--session-id <fixed uuid>`, OK.
- xA1 fresh, ENV. xA2 `resume <xA1 thread id>`, OK. xA3 `resume --last`, OK.
- xA5 fresh: "Use your subagent tool to start one subagent. Tell it to run exactly the shell command `echo
  from-subagent` and return its output. Then report that output."
- xA6 fresh, `$fh-probe:noop hello`.

Recorded per case: the probe log lines it produced, the host's own id (Claude `system/init` `session_id`, Codex
`thread.started` `thread_id`), the agent's messages and shell commands, exit codes, elapsed time, tokens, Claude cost.

## Not in scope
Interactive TUI sessions, Codex compaction (no command in `exec`), two sessions running at the same moment (the ids of
separate fresh sessions are compared instead), hook trust through `/hooks`.

## Metrics
Exit codes, elapsed ms, tokens and Claude cost per call. Deltas N/A.

## Decision
The owner design uses whichever field Q1 shows on both hosts. Q2 decides whether resume and compaction keep ownership
or need a take-over step; Q3 decides whether the hard-limit shell hook can be limited to the owner without leaving a
subagent of the owner unguarded; Q4 decides whether the agent can read its own id from the shell; Q5 decides whether a
`UserPromptSubmit` hook can recognise the skill command.

## Deviations recorded after freezing
- 2026-10-13, before any measured call: the first start crashed in cA1 before invoking `claude` (the case table
  evaluated `first_id()` for every key) and the cleanup step wrote a DONE marker. Both empty directories were removed
  and the runner fixed (lazy lookup; CLEANUP always runs and records nothing). `frozen.sha256` was regenerated.
