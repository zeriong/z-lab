# Angry Birds Web Game: Complete Implementation Plan
- Reasoning frame: spec-coverage / Style: opus
- One-line summary: A physics-based slingshot game with 10 authored stages, state-machine UI, and a complete rendering + persistence + effects stack.

---

<!-- plan-smith:index -->
> This file is an index — it holds no implementation. Read every part below in order; each one ends
> with a pointer to the next. Do not start the work from this file alone.

| order | part | covers | read after |
|---|---|---|---|
| A0 | [overview_A0.md](parts/overview_A0.md) | Intent packet, Problem definition, Explicit assumptions | — |
| A1 | [coverage_A1.md](parts/coverage_A1.md) | Coverage matrix, Quality floor per surface | A0 |
| B0 | [requirements_B0.md](parts/requirements_B0.md) | Requirements & detailed behaviors (1–18) | A1 |
| C0 | [steps_C0.md](parts/steps_C0.md) | Approach & steps — Phases 1–3 (steps 1–8) | B0 |
| C1 | [steps_C1.md](parts/steps_C1.md) | Approach & steps — Phases 4–8 (steps 9–15, thin slice) | C0 |
| D0 | [load-bearing-path_D0.md](parts/load-bearing-path_D0.md) | Load-bearing path (hops 1–5, cold-start table) | C1 |
| E0 | [contract_E0.md](parts/contract_E0.md) | Definition of "done", Implementer contract, Risks & mitigations, Alternatives & rejection rationale, Frame deviations & habit regressions | D0 |
<!-- /plan-smith:index -->
