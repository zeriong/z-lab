# Context Packet — angry-birds-browser
- Date: 2026-08-12
- Requested by: test/game-prompt.md (z-lab experiment)
- Language of artifacts: Korean (in conversation), English (in code and technical plan)

## Run stamp — record, never guess
- plan-smith version: (via embedded skill)
- frames.md fingerprint: spec-coverage + backward (borrowed for architecture cell)
- Main agent model: claude-haiku-4-5-20251001
- plan-writer model: claude-haiku-4-5-20251001
- Skill invocation: scripted/batch (z-lab experiment harness)

## Task (one line)
Write a complete implementation plan for a browser-based Angry Birds physics game with 10 stages, slingshot mechanics, and pause/resume UI.

## Background (why now)
This is a comparative experiment (z-lab opus-5 corpus) measuring plan-smith methodology output. The same 6 cells (fable/opus/sonnet × /plan / /plan-smith) receive this prompt to measure planning quality; no implementation is executed.

## Goal — definition of success
A plan that:
1. Covers every requirement from the spec without silent omission (10 stages, physics, pause UI)
2. Answers the 7 core architectural questions with clear trade-offs stated
3. Specifies a closed load-bearing path (launch → gameplay loop → stage clear → persist)
4. Provides verb-form requirements (not a feature inventory) for each surface
5. Pins stack/versions and done criteria to measurable commands/artifacts

## Hard constraints
- Browser-based (user requirement)
- 10 stages exactly (user requirement)
- Physics-based projectile gameplay (user requirement)
- Pause button on right side with restart/menu options (user requirement)
- Plan only — no code execution, no build verification possible

## Soft preferences
- Prioritize clarity over compression (the prompt signals 7 architectural questions as in-scope)
- Architecture should enable iteration (if physics choice proves insufficient, the plan should declare the recovery path)

## Rejected alternatives (and why)
- **Rejection: Defer architecture to implementation phase** — the prompt explicitly names physics/rendering choices as things "the plan must answer". A plan that names the issue but defers the decision is incomplete per this task's standards.
- **Rejection: Use a pre-existing game framework (Phaser, Babylon)** — while valid for production, this is mentioned implicitly; the prompt asks for principled choice (Matter.js vs custom vs lightweight physics), indicating the frame should drive the decision, not assume one.

## Decisions already made
- Game is 2D (implied by "web browser" + "Angry Birds" analog)
- Stages are sequential (implied by "stage system")
- Goals are destructible (implied by "破壊").

## Relevant files & paths
- `/Users/jeonjelyong/Desktop/WorkSpace/Z-Work/z-lab/plan-smith-lab/test/game-prompt.md` — why it matters: defines exact requirements (10 stages, pause UI requirement, core questions). Takeaway: complete spec with embedded architectural questions.
- `/Users/jeonjelyong/Desktop/WorkSpace/Z-Work/plan-smith/plugins/plan-smith/skills/plan-smith/references/frames.md` — why it matters: spec-coverage frame prevents silent omission of requirements; backward frame handles architecture cell. Takeaway: spec-coverage required component "Requirements get verbs" is enforced via "when actor does X, visible result Y; absence shows Z".
- `/Users/jeonjelyong/Desktop/WorkSpace/Z-Work/plan-smith/plugins/plan-smith/skills/plan-smith/references/styles.md` — why it matters: opus-style demands coverage breadth and honest self-report. Takeaway: plan must name weakest sections in confession.

## Unknowns & open questions
- Internet connectivity assumptions (offline-first? online-required?)
- Persistence scope (save progress per stage or full run?)
- Difficulty curve (how do 10 stages escalate? particle count? structure complexity?)
- Score/star system rules (2-star vs 3-star logic?)

These are *not* fatal — the plan will carry them into Risks/Assumptions and mark them resolvable-at-implementation.

## Deliverable type (Gate 0)
- Type: **build-out**
- Rationale: Followed literally, is the danger a wrong choice or an omission? Answer: omission. The spec is complete (10 stages, physics, pause); the danger is thin architecture, missing integrations, unspecified surfaces. A choice-frame like `backward` would license cutting audio/effects/persistence as "off-anchor" — the prompt's 7 questions signal these ARE in-scope for the architecture, not off-limits.
- Borrow: Yes. `backward` frame is borrowed for one cell only: the architecture sub-decision section (physics engine vs rendering choice). `spec-coverage` owns structure and completeness.

## Load-bearing path candidate (build-out only)
- Path: Player enters game → picks stage → enters level → aims slingshot → launches projectile → objects collide → structures break → targets destroyed → stage cleared → progress saved → next stage available → all 10 stages complete.
- Why this one: Everything else (pause, scoring, visuals) decorates this path. If this path doesn't close, the game is not playable.

## Frame selection
- Frame: **spec-coverage** (primary, per Gate 0)
- Borrow: **backward** (architecture cell only: physics engine choice derived from acceptance criteria)
- Rationale: Predicate ① fires (nothing unknown, execution-only); Gate 0 confirms build-out (risk is omission, not wrong choice). A narrowing frame like backward would cut scope. spec-coverage ensures all requirements surface, and the backward borrow handles the 7 architectural questions as a sub-decision cell, preventing them from invisibly disappearing during implementation.

## Style selection
- Style: **opus**
- Execution mode: standalone (no follow-up pass)
- Rationale: Auto-routing signal: first draft, breadth-critical (7 required architecture decisions), organization-consumable (stakeholders must approve it). Opus optimizes coverage over depth — this task demands coverage (10 stages must not vanish) before depth (stage design).

## Output contract
- Plan file: `/Users/jeonjelyong/Desktop/WorkSpace/Z-Work/z-lab/plan-smith-lab/pure-model/haiku-4.5/plan-smith/plan.md`

## Retrospective
<!-- appended after user verdict: outcome: <adopted|edited|rejected> — frame <name>, style <name>, one-line note -->
