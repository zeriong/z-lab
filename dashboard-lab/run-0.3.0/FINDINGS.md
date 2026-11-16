# Findings — dashboard 0.3.0 candidate, the band follows a free-hands run mid-turn

Claude Code 2.1.325, tmux 3.8, Python 3.9.6 (`runs/V00`), macOS, 2026-11-16, Sonnet 5.5 at effort xhigh. Subject
`subject/` (sha256 `subject.sha256`), control `control/dashboard-0.2.0/` (`control.sha256`); both cases ran the same
free-hands 0.5.0 candidate. Records: `runs/<case>/` (`screens.json` every 2 s with the parsed free-hands entry,
`summary.json` with turn-log's rows, the goal file and the free-hands records after). n=1 per case. Interactive: no
token counts; elapsed 98 s (K1) and 96 s (B1).

## Measured

- **D09 — The candidate redrew the band after every finished item, inside the turn.** B1: the free-hands entry read
  `active 0/10 · 3 open · ETA 15:29 (project) · ~6m left`, then `2 open · ETA 15:26 · ~3m left` at 28.3 s, `1 open ·
  ETA 15:25 · ~1m left` at 52.6 s and `done` at 76.9 s — three changes before `turn.complete` (78.1 s). Each change came
  1.4, 1.6 and 2.0 s after free-hands recorded the item finished (26.9, 50.9, 74.9 s; captures are 2 s apart).
- **D10 — 0.2.0 redrew once inside the turn, not per item.** K1: the entry kept `3 open · ETA 15:27 · ~6m left` while
  the first item finished (28.5 s), changed once to `1 open · ETA 15:23 · ~1m left` at 52.7 s, 1.2 s after the second
  item finished, skipped the `2 open` state, and showed `done` at 81.1 s, after `turn.complete` (80.2 s). 0.2.0 refreshes
  on `session.measure` when the usage window moves, which free-hands-lab `eta-probes-r4` saw once mid-turn; this case
  did not log module events, so the cause of the one change is not measured. The SPEC expected no change; the
  decision does not rest on it.
- **D11 — The free-hands candidate's entry reaches the band.** Both cases showed `ETA <clock>` and `~<n>m left` in the
  entry while items were open, and the recorder wrote three rows (est 2.0, actual 0.39–0.59 min, family sonnet,
  effort xhigh) in B1.

## Not measured

Codex; terminals other than tmux; a status other than free-hands' naming `watch`; the time a refresh adds to a tool
call; whether the estimate was right (free-hands-lab `eta-calibrate-0.5.0`, `eta-validate-0.5.0`); several sessions.

## Decision (SPEC)

B1 showed `ETA` while items were open and its open count changed three times before `turn.complete`: the candidate
ships as dashboard 0.3.0. K1 changed once mid-turn, unlike the SPEC's expectation (D10), and never showed the
intermediate state.
