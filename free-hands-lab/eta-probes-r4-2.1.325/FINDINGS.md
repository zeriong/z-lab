# Findings — free-hands ETA platform probes, round 4 (Q4 only)

Claude Code 2.1.325, tmux 3.8 (`runs/V00`), macOS, 2026-11-16, Sonnet 5.5 at effort xhigh, free-hands 0.4.1 extracted
from because-i-needed `34a786b`. Records: `runs/Q4/` (`module.jsonl` is mod-probe's own log, `screens.json` the
captures every 2 s). n=1. Interactive: no token counts; elapsed 57 s.

## Measured

- **T08 (again) — A Stop that free-hands blocks does not end the turn for a mod.** Asked to do only the first item and
  end the turn, the agent stopped twice with items open: the goal ended `status: done`, `iterations: 2`, all three
  items `[x]`. mod-probe logged one `turn.start` (6.3 s) and one `turn.complete` (48.7 s). `session.measure` fired at
  0.4 s, at 47.3 s (`changed: context, rateLimits, cost`) and after the turn — not at either blocked Stop.
- **T09 — A mod's `tool.call` handler, after `next(e)`, runs once the tool's effect is on disk.** Each Edit's row read
  the goal file with one more `[x]` (open/done 3/0 → 2/1 → 1/2 → 0/3 at the Edit rows at 20.5 s, 34.0 s, 46.7 s); the
  Bash rows recorded the six-second `sleep` between `before` and `after` (7266, 6621, 6596 ms).
- **T10 — A band drawn from an atom that a `tool.call` handler updates redraws while the turn is still running.** The
  captured band read `probe-band calls=1` at 10.2 s, then 2, 3, 4, 5, 6, 7 and 8 at 48.8 s, each before the
  `turn.complete` at 48.7 s except the last; the band changed seven times inside one turn.
- **T11 — One `$.process.run(['python3', '-c', 'pass'])` from that handler took 25–107 ms** (8 calls; median 31 ms).

## Not measured

Codex; other terminals than tmux; a status command slower than `python3 -c pass`; several sessions at once.

## Decision (SPEC)

Nothing ships from this experiment. For the dashboard: a band that should follow a free-hands run must refresh from
`tool.call` (T09, T10), since `turn.complete` comes only when the whole run ends (T08); one refresh costs at least a
process start (T11), so refreshes are throttled.
