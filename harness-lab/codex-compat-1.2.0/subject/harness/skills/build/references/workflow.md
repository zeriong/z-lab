# Generated harness-engineering contract

This public contract is self-contained. It is based on the requirements in this
plugin, and does not require a private setup guide or research document.

Generate the project-specific `harness-engineering/SKILL.md` with these eleven phases.
Use the selected host's real paths and reviewer dispatch; retain the project's
existing commands and include only rules derived from the target repository.

0. **Intake:** resolve the requested outcome, scope and constraints; reuse already
   answered questions. A bypass-marked request skips this workflow.
1. **Reconnaissance:** read affected code, check claims against files and usages, and
   record `file:line` evidence. Recheck the affected scope after any patch.
2. **Rules:** select the applicable project-rules and convention references. Separate
   deterministic gate rules from advisory guidance; introduce no unsupported rules.
3. **Plan:** choose the smallest change satisfying the confirmed outcome and name
   the checks that establish success. Resolve material unknowns before implementation.
4. **Implement:** make the scoped change following the evidenced project conventions.
5. **Behavior checks:** run the relevant existing tests and add coverage where behavior
   changes or a regression needs it. Record failures and their evidence.
6. **Static checks:** run the lint/typecheck commands locked in intake; record the
   actual results, including any unavailable checks.
7. **Documentation:** update affected convention examples and user-facing behavior
   documentation; keep citations and keyword indexes consistent with the code.
8. **Review gate:** run `review-gate.sh --mode=full`, then obtain the two independent
   one-shot reviews described in SKILL.md Phase 6.2. Main synthesizes the results;
   reviewers propose changes only. Grade patches against the six quality axes. Every
   applied patch returns to Phase 1. Stop after three review/regression iterations
   with the remaining findings if the gate does not pass.
9. **Final verification:** verify the actual final diff, tests and remaining findings.
   Never call an unavailable or failed check a pass.
10. **Delivery:** report changed behavior, evidence and limitations. Commit or publish
    only when the user has authorized that action.

The prompt hook injects the generated project-rules and this generated workflow body.
For a bypass prompt (`!` prefix, `harness 빼고`, `without harness`, `skip harness`,
`no harness`), inject a short `BYPASS MODE` note instead. Bypass applies to this harness
workflow only and does not disable other project instructions or unrelated hooks.
