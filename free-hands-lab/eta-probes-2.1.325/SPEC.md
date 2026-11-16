# free-hands ETA — platform probes (Claude Code)

Frozen before running, 2026-11-16. CLI versions recorded by V00. Claude Code only: the maintainer leads the Codex side
separately (request, 2026-11-16). No plugin candidate is measured here; these are the facts an ETA design would rest
on, run instead of recalled (root Rule 9).

## Objective
Before designing an estimated-completion time for a free-hands goal on the dashboard, measure:
1. which hook inputs carry the model (and effort) that runs the session, and whether the transcript names it;
2. whether a `PostToolUse` hook sees a checklist item flip in the goal file whatever route the agent edits it by (Bash
   `sed`, the Edit tool, a Bash `python3 -c` rewrite, the Write tool), and what a subagent's tool calls send;
3. which isolation flags keep the account's installed plugins, user hooks and CLAUDE.md files out of a lab run while
   a `--plugin-dir` plugin still loads (the later calibration runs need a clean, repeatable environment);
4. in an interactive session, whether a free-hands Stop block ends a turn for a Claude mod (`turn.complete`), whether
   a mod's `tool.call` handler runs after the tool's effect is on disk, and whether a band redrawn from an atom
   updated there changes while the turn is still running (the dashboard refreshes only on `session.start`,
   `turn.complete` and `session.measure` today).

## Isolation
- Each case runs in a scratch git repository under the system temp directory; `CXC_MODE=off`.
- `hook-probe` (built by `run.py`): one command hook for each of SessionStart, UserPromptSubmit, PreToolUse (`*`),
  PostToolUse (`*`), Stop and SubagentStop. It appends `{at, event, keys, input, watch}` to `$PROBE_LOG`, where
  `input` is the hook's JSON with strings cut at 300 characters and `watch` the mtime and sha256 of `$PROBE_WATCH`.
  It prints nothing and exits 0.
- `-p` cases: `claude -p <prompt> --plugin-dir <hook-probe> --model sonnet --effort xhigh --output-format stream-json
  --verbose --include-hook-events --permission-mode acceptEdits --allowedTools Bash Read Write Edit Agent` plus the
  case's isolation flag.

## Cases (n=1)
- **V00** — `claude --version`, `tmux -V`, `python3 --version`, `node --version`.
- **Q1 — hook inputs and edit routes** (`--setting-sources project,local`). `notes.md` holds `## Checklist` and
  `- [ ] one` … `- [ ] four`; `PROBE_WATCH=notes.md`. Prompt: do in order, each with the named tool — (1) Bash `sed -i ''
  's/- \[ \] one/- [x] one/' notes.md`; (2) Edit: `- [ ] two` → `- [x] two`; (3) Bash `python3 -c` rewrite for
  `three`; (4) Write: the whole file with `four` checked; (5) the Agent tool (general-purpose) has a subagent run
  `echo sub` with Bash. Recorded: every hook row, the stream's `system/init` event, the session transcript (copied from
  the `transcript_path` a hook received) and the `model` of its assistant messages.
- **Q2 — `--safe-mode`** with `--plugin-dir hook-probe`. Prompt: "List the absolute path of every CLAUDE.md or memory
  file whose contents were given to you in this session, one per line, or the word none. Then stop." Recorded: whether
  any hook-probe row was written, the init event's plugins, the hook events in the stream, the reply.
- **Q3 — `--setting-sources project,local`**, the same prompt and records as Q2.
- **Q4 — interactive mod in a free-hands loop** (tmux 200×50, `claude --plugin-dir <mod-probe> --plugin-dir
  <free-hands> --session-id <uuid> --setting-sources project,local --model sonnet --effort xhigh --permission-mode
  acceptEdits --allowedTools Bash Read Write Edit`). `<free-hands>` is a copy of because-i-needed `plugins/free-hands`
  at the commit recorded in `summary.json` (0.4.1). Goal file: `status: active`, `max_iterations: 6`, `iterations: 0`,
  `owner: <uuid>`, `default_branch: main`, three items "item a/b/c: run `sleep 6`, then mark this item `- [x]`".
  `mod-probe` logs `turn.start`, `turn.complete`, `session.measure`, and for every `tool.call` the time before and after
  `next(e)` with the tool name and the goal file's sha256 after; after each call it raises an atom `calls` and times
  one `$.process.run(['python3', '-c', 'pass'])`; its AbovePrompt band reads `probe-band calls=<n>`. Prompt: "Read
  .free-hands/goal.md. Do only the first open item, then end your turn." The screen is captured every 2 s until the
  goal has no open item or 240 s pass, then once more 5 s later.

## Not in scope
Codex; the desktop, IDE and web surfaces; an ETA candidate; estimate accuracy (later experiments); several sessions at
once.

## Metrics
Exit codes, elapsed ms, tokens and cost per `-p` call; Q4 elapsed ms only (interactive sessions expose no tokens).

## Decision
None ships from this experiment. Its findings fix how a later candidate learns the model (Q1), detects a finished item
(Q1), isolates calibration runs (Q2, Q3) and refreshes the dashboard band (Q4). A contradicted assumption is recorded
as such.
