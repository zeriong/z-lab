# Metrics

From runs/*/summary.json. Claude `input_tokens` exclude the cache columns.

| Case | Step | Exit | Elapsed ms | Input | Cache read | Cache write | Output | Cost USD |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| S1 | parent (Sonnet) | 0 | 6210 | 4 | 29520 | 9782 | 77 | 0.042858 |
| S2 | estimator (Haiku) | 0 | 4493 | 4 | 34419 | 9519 | 392 | 0.0024443900000000003 |
| S3 | parent (Sonnet) | 0 | 4468 | 4 | 29523 | 9785 | 77 | 0.0428703 |
| S3 | estimator (Haiku, from the hook) | 0 | 4211 | 4 | 36219 | 7551 | 505 | 0.00212529 |

Versions (V00): 2.1.325 (Claude Code), Python 3.9.6. S3 estimator elapsed = its own `duration_ms`. Deltas: N/A.
