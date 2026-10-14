# budget 0.1.0 pre-build probe, round 2 — the full gate sequence on Codex

Frozen before running, 2026-10-14. CLI versions recorded by V00. Sibling of `codex-gate-0.1.0` (B01–B03); that
directory is not edited.

## Why
B01: in a fresh session the first tool call comes before any `rate_limits` record in the session's own rollout, so the
gate never engaged and the answer step was never exercised. The account's window is the same in every session, so the
gate can read the newest record among the account's recent rollouts. This round measures that read and the whole
sequence: deny → the agent asks → "예" unlocks and the command runs; "아니오" keeps the session locked.

## Probe
`gate-probe` as in `codex-gate-0.1.0`, with one change in `gate.py`: PreToolUse reads the newest rate-limit record (by
the rollout line's `timestamp`) among the session's own rollout and the 20 most recently written `rollout-*.jsonl`
under the same `sessions/` directory (three levels above `transcript_path`), and logs which file it came from.

## Isolation
As `codex-gate-0.1.0`: a scratch repository and a temporary `XDG_CONFIG_HOME` per case; one temporary `CODEX_HOME` per
case with a copy of the account's `auth.json` (sha256 of the original before/after), deleted at the end of the case;
the newest `luna` at `medium`; `CXC_MODE=off`. No free-hands.

## Cases (n=1), each: a bootstrap exec "Reply with the word ok." (so the home holds a rollout with a rate-limit
record), then a fresh exec, then (R1, R2) `exec resume <fresh thread> <answer>`
- **R1** — threshold 0; fresh: "Run exactly this shell command once and report its output: \`echo after-yes\`";
  resume with "예".
- **R2** — threshold 0; the same with \`echo after-no\`; resume with "아니오".
- **R3** — threshold 99 (control); \`echo open\`; no resume.

Recorded: `gate.jsonl`, each exec's command items and agent messages, the state files.

## Not in scope
free-hands (B03 already shows the conflict), the TUI, `/hooks` trust, the 5-hour window.

## Metrics
Exit codes, elapsed ms, tokens per call. Deltas N/A.

## Decision
The Codex route ships if, in R1, the fresh session's first call is denied from another rollout's record, the agent
ends the turn with the question and runs nothing, and after "예" the command runs; in R2 nothing runs after "아니오";
in R3 the command runs untouched.
