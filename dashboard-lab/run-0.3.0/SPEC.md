# dashboard 0.3.0 candidate — the band follows a free-hands run mid-turn

Frozen before running, 2026-11-16. CLI versions recorded by V00. Claude Code only (the maintainer leads Codex
separately, request 2026-11-16; on Codex the dashboard is a command and nothing here changes it).

Subject: `subject/dashboard/` — the candidate: a status may name absolute files in `watch` (passed on by
`scripts/dashboard.py`), and the module, after every `tool.call`, re-reads those files and refreshes when one changed;
and `subject/free-hands/` — the free-hands 0.5.0 candidate, whose `status` names the goal file in `watch` and adds
`ETA <clock>` and `~<n>m left` from the items' `(~<minutes>m <category>)` estimates (its baseline holds no factor yet).
Control: `control/dashboard-0.2.0/` (`git archive` of because-i-needed `34a786b`, the released 0.2.0) with the same
free-hands candidate. sha256 lists: `subject.sha256`, `control.sha256`. The runner never edits them. Maintainer
`CLAUDE.md` files left out.

## Why
free-hands works through a goal inside one turn, and a Stop it blocks does not end that turn (z-lab
`free-hands-lab/eta-probes-r3-2.1.325`, `-r4` T08). dashboard 0.2.0 refreshes at session start, after a turn and when
the usage window moves, so the expected finish of a free-hands goal would update only when the whole run ends. A mod's
`tool.call` handler sees a tool's effect on disk and can redraw the band mid-turn (`-r4` T09, T10).

## Isolation
- A scratch git repository; `.free-hands/goal.md` (`status: active`, `max_iterations: 10`, `iterations: 0`, `owner:`
  the case's `--session-id`, `default_branch: main`) with three items `item a|b|c: run \`sleep 20\`, then mark this item
  \`- [x]\` (~2m ops)`.
- `claude --plugin-dir <dashboard copy> --plugin-dir <free-hands copy> --plugin-dir <turn-log> --session-id <uuid>
  --setting-sources project,local --model sonnet --effort xhigh --permission-mode acceptEdits --allowedTools Bash Read
  Write Edit`, in tmux 200×50, with `BECAUSE_I_NEEDED_PLUGIN_DIRS=<free-hands copy>`, `XDG_CONFIG_HOME` a temporary
  folder, `CXC_MODE` unset. `--setting-sources project,local` leaves the account's installed plugins out
  (`free-hands-lab/eta-probes-2.1.325` T06), so the band holds the free-hands entry only.
- `turn-log` (built by the runner): a module that appends `turn.start` and `turn.complete` with the time to a log
  outside the repository. It declares no state.
- The folder-trust dialog: wait 2 s, Down, wait for `❯ Yes, I trust this folder`, Enter (as `eta-probes-r3`).
- Prompt: "Read .free-hands/goal.md and work through its checklist." The screen is captured every 2 s until the goal
  has no open item and `turn.complete` is logged, or 300 s pass, then once more 5 s later.

## Cases (n=1)
- **V00** — `claude --version`, `tmux -V`, `python3 --version`.
- **K1 — control**: dashboard 0.2.0 + the free-hands candidate.
- **B1 — candidate**: dashboard candidate + the free-hands candidate.

Recorded: every screen, the free-hands entry parsed from each (`🙌free-hands: <value>` and its detail), turn-log's
rows, the goal file after.

## Not in scope
Codex; other terminals; the accuracy of the expected finish (free-hands-lab `eta-calibrate-0.5.0` and its
validation); a status command other than free-hands' with `watch`; several sessions at once.

## Metrics
Elapsed ms per case; the number of distinct free-hands values shown before `turn.complete`. Deltas N/A.

## Decision
The candidate ships if B1's band shows `ETA` while items are open and its open-item count changes at least twice before
`turn.complete`. K1 is expected to keep its first value until the turn ends; if it does not, that is recorded and the
change is re-examined.
