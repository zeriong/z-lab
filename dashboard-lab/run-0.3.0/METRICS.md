# Metrics

Interactive cases only: Claude Code exposes no token or cost counts in a TUI session.

| Case | Dashboard | Elapsed ms | Distinct free-hands values before `turn.complete` | Changes before `turn.complete` |
|---|---|---:|---:|---:|
| K1 | 0.2.0 (control) | 97838 | 2 | 1 |
| B1 | 0.3.0 candidate | 96233 | 4 | 3 |

Versions (V00): 2.1.325 (Claude Code), tmux 3.8, Python 3.9.6.
Delta: changes before `turn.complete`, B1 vs K1: 3 vs 1 (+200 %).
