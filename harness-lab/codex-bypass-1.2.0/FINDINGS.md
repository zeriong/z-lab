# H07 — Bypass keeps project-rules

## Measured

The old bundled asset passed only normal requests (2/14 cases). All five bypass phrases on both layouts incorrectly omitted the rule sentinel; missing-rule diagnostics during bypass were also absent. The corrected source passes 14/14: normal includes both bodies, bypass retains rules and omits only the workflow, and incomplete rule setup is reported. The nine-test shared suite also passes with assertions against the existing README contract.

## Not measured

This tests deterministic source execution, not automatic host hook activation or semantic model compliance. Elapsed time is n=1 per arm and is not a performance claim. Specs and before/after sources and raw results remain unchanged.
