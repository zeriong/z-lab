# Codex setting parity findings

## S03 — Explicit writer settings reach fresh dispatch

The one-shot forge probe used the actual skill, body, backward frame and opus style. The packet recorded `gpt-6-astra` / `xhigh`. The event transcript records independent `plan_writer` dispatch with `fork_turns=none` and those explicit settings; the writer produced a 247-word plan and the main relayed it. Application source was not changed and no commit was created. See `runs/plan/events.jsonl` and `runs/plan/specimen/plans/json-vs-sqlite/`.

## Not measured

This probe is one short decision plan. It does not compare model quality, test every frame/style, or re-run long-plan splitting; the unchanged splitter's eleven self-tests pass in P05. CLI child fallback and unavailable-model failure are documented routes, not newly exercised here. Usage is the root CLI counter; nested agent usage was not separately billed or reconstructed.
