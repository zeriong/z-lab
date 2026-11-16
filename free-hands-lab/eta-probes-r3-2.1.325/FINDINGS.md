# Findings — free-hands ETA platform probes, round 3 (Q4 only)

Claude Code 2.1.325, tmux 3.8 (`runs/V00`), macOS, 2026-11-16, Sonnet 5.5 at effort xhigh. Records: `runs/Q4/`
(`module.jsonl` is mod-probe's own log, `screens.json` the captures). n=1. Interactive: no token counts; elapsed 57 s.

## Measured

- **T07 — The trust step held.** `❯ Yes, I trust this folder` was selected before Enter (`trust_yes_selected`), and
  the session reached the prompt.
- **T08 — A Stop that free-hands blocks does not end the turn for a mod.** Asked to do only the first item and end the
  turn, the agent did all three; the goal ended `status: done` with `iterations: 1`, so free-hands' Stop hook blocked
  once. mod-probe logged one `turn.start` (6.2 s) and one `turn.complete` (48.3 s), then `session.measure` with
  `changed: [context, cost]` — no `turn.complete` and no `session.measure` at the blocked Stop. A dashboard that
  refreshes on `turn.complete` and `session.measure` alone would not redraw between the start and the end of this
  run.

## Deviations

- **No `tool.call` row was written.** mod-probe declared its atom under the plugin name `eta-probe` while the plugin
  is `mod-probe`. A diagnosis run outside the experiment with this module and a step log (not a case) showed the
  engine's denial — `HooksError: mod-probe: state.set: denied: eta-probe owns that value and only its owner writes it`
  — thrown after `next(e)` had run the tool; the handler's `.catch` passed the call on, so the tool ran but the log
  row and the band's count never came. With the atom under the right owner, the same diagnosis logged `tool.call`
  before and after the tool, the count, a 25–26 ms `$.process.run(['python3', '-c', 'pass'])`, and a band reading
  `calls=1` at the end of the turn. Measured as a case in `../eta-probes-r4-2.1.325/`.
- **The free-hands copy was not 0.4.1.** The runner copied the working tree of because-i-needed `plugins/free-hands`,
  which already held the uncommitted 0.5.0 candidate (`eta.py`, a PostToolUse hook, the ETA in `status`); the
  recorded commit and version (`34a786b`, 0.4.1) name the checkout, not the copy. The Stop guard and its counter, which
  T08 rests on, are unchanged in the candidate. Round 4 extracts the commit with `git archive`.

## Not measured

Whether a band redraws while a turn is still running (no count was ever raised); the latency of a refresh.
