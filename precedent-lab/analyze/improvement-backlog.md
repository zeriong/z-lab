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

## Decisions (maintainer, 2026-10-23)

- **D6 — Measure the agents that do the work, including Codex workers.** Six arms for E6 and seven for E6′; records
  stay in this series only.
  - Reason: orchestration and model routing hand the edits to leaf agents, and peer-coding's `codex-bulk` lane is a
    Codex worker. This widens D5 for `leaf-2.1.309/` and `leaf-r2-2.1.309/`; D5 still holds for the rest.
- **D7 — If the fixed paragraph passes everywhere except the Opus subagent's legitimate overrides (X < 10/12), hold the
  release.** Frozen in `leaf-r2-2.1.309/SPEC.md` before the run; it did not trigger (X 12/12).

## Changes

- **A3 paragraph → context-rail 0.2.0.** `leaf-2.1.309/` (E6) found the delegation gap: Sonnet subagents read a main
  agent's conditional pre-authorization as the user's override (6/9), and Opus subagents refused a correctly relayed
  named override (3/12). `leaf-r2-2.1.309/` (E6′) adopted A3, which says when a brief from another agent counts:
  every A3 arm 0/12 · 12/12 · 0/15, and the fixed pre-authorization brief 12/12 → 0/12.

## Backlog

- E3b: Korean records with A′/A3; effort high/max. Subagent behavior is now measured (`leaf-*`).
- A main agent that invents a named override the user never gave (the path A3 leaves open). Not induced; 0/24 in E6′.
- The boundary of "names the record": a file name only, or "the old rule".
- Conflict-free edits close to a decision (the same function, an unrelated branch).
- `install-hooks.py --check` stops with exit 2 when the installed hook differs from the asset, so `audit` cannot
  report the wiring from it (`audit-canary-0.1.0` U4). Candidate: separate the wiring check from the content check.
  Changing the script means a new measurement.
