# Findings — free-hands ETA platform probes (Claude Code)

Claude Code 2.1.325, tmux 3.8, Python 3.9.6, Node 25.9.0 (`runs/V00`), macOS, 2026-11-16, Sonnet 5.5 at effort xhigh.
Records: `runs/<case>/` (`hooks.jsonl` is hook-probe's own log, `transcript-0.jsonl` the copied session transcript).
Numbers: `METRICS.md` (3 `-p` calls, all exit 0, 0.23 USD). n=1 per case.

## Measured

- **T01 — No hook input names the model; the transcript does, and tool, Stop and SubagentStop inputs carry the
  effort.** Q1 input keys: SessionStart `cwd, hook_event_name, session_id, source, transcript_path`; UserPromptSubmit
  adds `permission_mode, prompt, prompt_id`; PreToolUse/PostToolUse add `effort, tool_input, tool_name, tool_use_id`
  (+ `tool_response, duration_ms` on PostToolUse); Stop adds `background_tasks, effort, last_assistant_message,
  session_crons, stop_hook_active`. `effort` was `{"level": "xhigh"}`. Every assistant message in the transcript at
  `transcript_path` had `message.model` `claude-sonnet-5-5` (10 of 10). The stream's `system/init` event also named
  the model, but no hook receives that event.
- **T02 — A `PostToolUse` hook sees the goal-file edit of the call it follows, by every route tried.** Q1, `notes.md`
  watched: after the Bash `sed` call, the Edit call, the Bash `python3 -c` rewrite and the Write call, the PostToolUse
  row of that same call already showed the new sha256 and one more `[x]` (1, 2, 3, 4); the PreToolUse rows before each
  showed the old one. A Read call between them left the hash unchanged.
- **T03 — PostToolUse reports how long the tool ran.** `duration_ms` was 1646 (sed), 3 (Edit, Write, Read), 740
  (python3), 711 (subagent's `echo`), 3956 (the Agent call that waited for the subagent).
- **T04 — A subagent's tool calls reach the parent session's hooks with `agent_id`.** Q1: the subagent's Bash
  PreToolUse/PostToolUse rows and SubagentStop carried the parent's `session_id`, `agent_id aeb864a3902737a9b` and
  `agent_type general-purpose`; the parent's Agent PostToolUse came after SubagentStop.
- **T05 — `--safe-mode` turns off the hooks of a `--plugin-dir` plugin too.** Q2: hook-probe wrote no row and the
  stream had no hook event, although `system/init` still listed hook-probe among all the account's installed plugins.
  Safe mode cannot isolate a run that measures a plugin's hooks.
- **T06 — `--setting-sources project,local` drops the account's installed plugins and user hooks, and keeps the
  `--plugin-dir` plugin.** Q1, Q3: `system/init` listed hook-probe, `orca-agent-view` (a folder under the Orca app's
  support directory, loaded outside the settings files) and five built-in `cc-plugin-*` entries — none of the 16
  plugins the user settings enable; the only hook events in the stream were hook-probe's. `memory_paths` held only the
  auto-memory folder. Asked to list the CLAUDE.md or memory files given to it, the model answered `none` in Q2 and Q3
  (a self-report).

## Deviation

- **Q4 did not run.** The runner pressed Enter on the folder-trust dialog, whose default is "No, exit" (the dialog in
  `plugin-platform-lab/mod-interactive-2.1.299` D1); the session exited before the prompt, mod-probe logged nothing and
  the goal file stayed as written (`runs/Q4/screens.json`). Objective 4 is measured in the sibling
  `../eta-probes-r2-2.1.325/` with the trust step fixed; this runner is left as frozen.

## Not measured

- Objective 4 here (see the deviation).
- Codex (out of scope by request); hooks other than the six probed; a failing Bash call (`PostToolUseFailure`,
  `precedent-lab/platform-2.1.306-0.163.0` P2); whether `orca-agent-view` adds hooks of its own.
- Whether a CLAUDE.md was loaded under T06, beyond `memory_paths` and the model's own answer.

## Decision (SPEC)

None ships. For a candidate: read the model from the transcript tail and the effort from the hook input (T01); detect
a finished item in `PostToolUse` by re-reading the goal file (T02); use `duration_ms` to tell a long tool call from an
idle gap (T03); count a subagent's calls as the run's work (T04); isolate calibration runs with
`--setting-sources project,local`, not `--safe-mode` (T05, T06).
