# Context Packet — json-vs-sqlite-notes
- Date: 2026-09-30
- Requested by: user
- Language of artifacts: Korean (project instruction requires all user-facing answers in Korean)

## Run stamp — record, never guess
- plan-smith version: 1.7.0 (active `.codex-plugin/plugin.json`)
- frames.md fingerprint: SHA-256 `a3df58434a23a187fe9cf84d0737bbeb8201a27cff08ff8fd87c5482fc1cd760`
- Main agent model: unknown (host does not expose its resolved model id)
- plan-writer model: gpt-6.1-sol (fresh native subagent dispatch `model` field; the host did not expose a separate runtime model header)
- plan-writer effort: medium
- Skill invocation: Codex `$plan-smith:forge`, interactive session

## Task (one line)
Choose JSON file or SQLite for persistence in a local offline, single-user note app.

## Background (why now)
The user requests a short decision plan, not application implementation. `source.txt` confirms title and body records, no sync, and no concurrency. The user has already confirmed the task and preferences.

## Goal — definition of success
A plan under 250 words gives a justified choice between JSON file and SQLite, a simple validation step, and a trigger to revisit the choice.

## Hard constraints
- Offline, single user, title and body records; no sync and no concurrency — user confirmation and `source.txt`.
- Human implementer — user confirmation.
- Do not propose a hosted database — user rejected it.
- Use `backward` frame and `opus` style — user instruction.
- Keep plan under 250 words — user instruction.
- Do not implement application code or commit — user and project instructions.
- The main agent must not write the plan; execute the isolated writer route — user instruction and forge skill.

## Soft preferences
- Keep decision and implementation burden small for a human implementer.

## Rejected alternatives (and why)
- Hosted database — rejected by user; offline local app does not require it.

## Decisions already made
- Task, no sync/concurrency, human implementer, hosted database rejection, frame `backward`, style `opus` — explicitly confirmed by user.

## Relevant files & paths
- `source.txt` — primary scope statement; it says local offline one-person notes with title and body, no sync or concurrency.
- `AGENTS.md` — project rules; do not commit and work only on this prompt.

## Unknowns & open questions
- Expected note count, attachment needs, search/query features, backup workflow, and target runtime are unstated; the plan should avoid inventing them and identify any that would change the choice.

## Deliverable type (Gate 0)
- Type: decision.
- Rationale: If followed literally, the principal risk is choosing the wrong storage format; no build-out is requested.
- Implementer: person (human), confirmed by user. Keep machinery light.

## Frame selection
- Frame: backward.
- Rationale: User-selected. Start from observable acceptance criteria and derive the storage choice.

## Style selection
- Style: opus.
- Execution mode: standalone.
- Rationale: User-selected; concise, coverage-first decision document for a human.

## Output contract
- Plan file: `plans/json-vs-sqlite-notes/plan.md`

## Retrospective
