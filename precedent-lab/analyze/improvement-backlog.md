# precedent-lab — decisions and backlog (context-rail)

because-i-needed Rule 9: a maintainer decision that is not a measurement is recorded here with its reason, marked as a decision. Each entry names the experiments it touches.

## Decisions (maintainer, 2026-10-22)

- **D1 — Plugin name `context-rail`; evidence series stays `precedent-lab/`.**
  - Reason: the plugin covers the whole rail, not only records. The maintainer wanted "rail" in the name.
  - Naming is packaging (Rule 9 exception).
- **D2 — z-lab masking by new commits, no history rewrite** (`REDACTION.md`, `5dacf36`).
  - Reason: z-lab Article 8 forbids force-push. Identifiers remaining in older history are accepted.
- **D3 — `build` only proposes personal items; it never moves them.**
  - Reason: the build would otherwise touch a teammate's committed files on the user's behalf.
- **D4 — An explicit override that names the recorded decision is the user's confirmation.** A conflicting request
  that does not name it is not, however firm.
  - Reason: the maintainer's ownership of decisions.
  - Shaped paragraph A′ (`stop-en-r2-2.1.306/`, adopted). Superseded the E3 reading, under which any request counted
    as no reason (`stop-en-2.1.306/` S3).
- **D5 — Measure on Claude Code only; Codex ships through the marketplace with the same workflow, unmeasured beyond
  delivery.**
  - Reason: the maintainer's scope call. The default Codex account was also at its usage limit
    (`platform-r2-2.1.308-0.163.0/` RUNLOG).
  - What is measured on Codex 0.163.0 (`platform-2.1.306-0.163.0/` P5–P8):
    - PostToolUse and UserPromptSubmit context reach the model;
    - the shell arrives as `Bash` with `{"command": …}`, and edits as `apply_patch`;
    - there is no failure event.
  - Not measured, and must be stated in the plugin README (Rules 9, 10): `apply_patch` delivery, nested `AGENTS.md`
    timing, the Codex cap, and all behavior effects.

## Backlog

- E3b: Korean records with A′; subagent delivery (96% of real-use paragraphs, `real-use-2.1.299-2.1.306/` R1);
  effort high/max.
- The boundary of "names the record": a file name only, or "the old rule".
- Conflict-free edits close to a decision (the same function, an unrelated branch).
