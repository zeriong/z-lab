# Metrics

Generated from each runs/*/metrics.json (or baseline-timing.json).

| Run | Exit | Elapsed ms | Reported input tokens | Reported output tokens |
|---|---:|---:|---:|---:|
| claude-off | 0 | 4329 | 2 | 7 |
| claude-on | 0 | 4236 | 2 | 10 |
| runtime-mode-json | 0 | 6198 | 15008 | 35 |

Elapsed milliseconds = monotonic end minus start. CLI usage is reported, not estimated. Codex input tokens include cached input; Claude cache creation/read token fields are separate in raw metrics.json. Reasoning tokens are a subset, not added again. Separate nested CLI reviewer usage is not added to the parent totals; the preserved reviewer logs expose those runs. Native subagent usage inclusion is not independently established.

Delta formula: 100 × (candidate − baseline) / baseline. All deltas are N/A: no equivalent quality/cost baseline was measured. Every agent run is one-shot; in-workflow review iterations remain part of that run. Interrupted wrapper setup is listed in LAUNCH-NOTE where applicable.
