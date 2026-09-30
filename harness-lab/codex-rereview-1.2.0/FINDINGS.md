# Re-review findings

## H08 — Reusable model defaults and numeric review scores

The prior specimen embedded generation-time gpt-6-astra/xhigh defaults and nested score/evidence objects, even though the shared build contract expects numeric scores. The reference now requires per-invocation current-session defaults and separate quality_evidence. A new real generator used the actual references and produced all four overrides, runtime main-setting resolution with no fixed model default, two explicit independent read-only CLI recipes, six numeric quality_scores and six evidence strings. Eleven phases, rule-preserving bypass, 3.5 per-reviewer threshold and cap three remain in the specimen.

Limits: one focused generation probe, not execution of the future implementation/reviewer loop across model changes. The earlier specimen was left untouched.
