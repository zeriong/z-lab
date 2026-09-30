# Metrics

| Source arm | Elapsed ms | Passed | Tokens |
|---|---:|---:|---|
| [Before](../../plugin-platform-lab/codex-rereview-0.158.0/before-probes/metrics.json) | 783 | 2/6 | n/a |
| [After](../../plugin-platform-lab/codex-rereview-0.158.0/after-final/metrics.json) | 1142 | 6/6 | n/a |

Elapsed delta = (after - before) / before * 100 = 45.85%. n=1; the after route performs extra target resolution, so this is not a speed comparison. Additional metadata/target isolation cases are included in the [shared eleven-test suite](../../plugin-platform-lab/codex-rereview-0.158.0/runs/final-resolver-isolation/commands.json).
