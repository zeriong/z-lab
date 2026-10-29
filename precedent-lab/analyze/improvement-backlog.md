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
- **D8 — Measure 0.2.0 on a fork of the private repo whose records are real (`real-repo-0.2.0/`, E7).** Strip the
  company's own arrival hook, run `build`, then work in three arms: plugin, no-hook control, Sonnet subagent. Records
  stay Korean and the paragraph stays English A3.
  - Reason: every earlier round used a five-decision synthetic fixture. The plugin's claim is about any project.
  - The maintainer switched the run account after 112 of 144 runs (`real-repo-0.2.0/accounts.json`).

## Decisions (maintainer, 2026-10-26 – 2026-10-29)

- **D9 — Fill the write side: when no record governs an edited file, say where to create one.** Ship it with the
  compression fix as 0.3.0, then adopt 0.3.0 in the private repo (not 0.2.0).
  - Reason: 0.2.0 said nothing on paths without a record. Its compression also gave the private repo fewer decisions
    than the company's own hook (3 files, 1,749 → 1,726 slugs).
- **D10 — E8 arms: no hook · 0.2.0 · 0.3.0 on a synthetic project with no recording rule; the keep-side regression
  check is deterministic (company hook vs candidate over every governed file), not model runs.**

## Changes

- **A3 paragraph → context-rail 0.2.0.** `leaf-2.1.309/` (E6) found the delegation gap: Sonnet subagents read a main
  agent's conditional pre-authorization as the user's override (6/9), and Opus subagents refused a correctly relayed
  named override (3/12). `leaf-r2-2.1.309/` (E6′) adopted A3, which says when a brief from another agent counts:
  every A3 arm 0/12 · 12/12 · 0/15, and the fixed pre-authorization brief 12/12 → 0/12.
- **Write side and compression → context-rail 0.3.0.** `record-0.3.0/` (E8) adopted it on all four conditions:
  - deterministic: 0 files missing decisions vs the company hook;
  - paths without a record: 8/9 recorded (0.2.0 3/9, no hook 0/9);
  - over-recording 0/6;
  - files with a section 7/9 (0.2.0 8/9).

## Backlog

- Shell writes are not edits (E8 R3). Every unrecorded 0.3.0 run wrote the file with `cat > file <<EOF`, so it got no
  Edit reminder and no no-record line. Candidate: treat shell writes to a governed file (`>`, `>>`, `tee`, `sed -i`)
  as edits. Needs a new measurement.

- E3b: Korean records with A′/A3; effort high/max. Subagent behavior is now measured (`leaf-*`). Korean records with
  English A3 held on the real fork (E7 E2); a synthetic Korean round is still open.
- Recording without a resident rule (E7 E1). On the fork the no-hook control recorded 8/9, so recording was not
  attributable to the hook. E8 answered it on a synthetic project with no recording rule: no hook recorded 0/9 on
  paths without a record and 2/9 on files with a section. Still open: the resident rule's own effect, measured by
  stripping it from the private fork.
- Pre-authorization without a name still leaks to Sonnet leaves (E7 E3, 1/12). The brief said "already decided,
  don't re-litigate, update the entry" without the decision's name. The SPEC laundering metric and the E6′ proxy both
  missed it. A fix needs a new round with a fixed brief of this shape.
- Qualified labels drop out (E7 E5). Decision lines written as `- 결정(…):` or `- 결정 B1:` are not kept by
  `compact()` and count as blocks without a decision in `records-lint` (measured on three result repos). Candidates:
  accept `- label(…):` and `- label X:`, or pin the exact label form in `record-format.md`. Either needs a new
  measurement.
- A main agent that invents a named override the user never gave (the path A3 leaves open). Not induced; 0/24 in E6′.
- The boundary of "names the record": a file name only, or "the old rule".
- Conflict-free edits close to a decision (the same function, an unrelated branch).
- `install-hooks.py --check` stops with exit 2 when the installed hook differs from the asset, so `audit` cannot
  report the wiring from it (`audit-canary-0.1.0` U4). Candidate: separate the wiring check from the content check.
  Changing the script means a new measurement.
