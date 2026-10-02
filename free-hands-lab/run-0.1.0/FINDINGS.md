# Findings — free-hands 0.1.0, guard and panel on both hosts

Claude Code 2.1.286, Codex CLI 0.159.3 (`runs/V00`), macOS, 2026-10-01. Subject `subject/free-hands/` (sha256 list
`subject.sha256`), never edited. Raw records: `runs/<case>/NN-*.stdout|stderr`, `runs/<case>/summary.json`; numbers:
`METRICS.md` (46 calls, all exit 0). Each case n=1 — a behavior seen once, not a rate.

**Deviation.** X01's first attempt stopped inside the runner before any CLI call: it looked for `auth.json` under
`~/.codex`, but this account's `CODEX_HOME` is Orca's per-account home. The runner was changed to read `CODEX_HOME`, the
empty `runs/X01` was removed, and X01–X07 ran (`run-log.txt`). C01–C04 were unaffected. The runner also cut every panel
file it stored in `summary.json` to 4,000 characters; after the run the full panel directories of C04 and X06 were copied
from the cases' temporary repositories into `evidence/` (sha256 list `evidence.sha256`), and F08/F09 count from those
copies (review FH-43).

## Measured

- **F01 — Claude: the hooks load with `--plugin-dir` and inject the restore note while a goal is active.** SessionStart and
  every UserPromptSubmit returned `[free-hands: ACTIVE] Goal file: …` (C01, C02, C04 hook events).
- **F02 — Claude: the stop guard blocks and counts** (hook events show each block, so these counts are the hook's). C02 one block (`iterations` 0 → 1), C04 four blocks (→ 4); each
  block reached the model as "Stop hook feedback: free-hands: 1 items still open — keep working …" and the run went on.
- **F03 — Claude: a finished status released the guard while items were open.** C01's prompt asked to do one item and
  "stop and wait for my approval". The model did the item, set `status: waiting` with two `- [ ]` items left and stopped;
  the guard, which engaged only on `status: active`, did nothing (`iterations` 0). The 0.1.0 skill reserves `waiting`
  for "no `[ ]` left, some `[-]`" and `paused` for a user's stop request, but nothing enforced it.
- **F04 — Codex: with `--dangerously-bypass-hook-trust` the plugin hooks run.** The models read the skill and the goal
  file without being told to (X02, X04, X05 without role) — the restore note reached them. One stop block is evidenced:
  in X02 the goal file already said `iterations: 1` when the model first read it, before it wrote anything. Codex
  `exec --json` prints no hook events, so other blocks cannot be told apart: in X01, X02 and X05 the model rewrote the
  goal file itself with a higher `iterations` (X01 → 1, X02 → 2, X05 → 1; review FH-42). X01 (same prompt as C01) ended
  `status: paused`, the status the skill prescribes for a stop request.
- **F05 — `FREE_HANDS_ROLE` keeps a Codex child out of the parent's goal.** X05 with the variable: reply "ok", no file
  read, goal unchanged. Without it, the same child read the skill and rewrote the parent's goal (marked its item done,
  `status: done`, `iterations: 1` written by the model).
- **F06 — Entry routing works on both hosts.** "free-hands로 hello.txt 파일에 hi 라고 써줘" got exactly the entry question
  (C03, X03). "응" → Claude invoked the Skill `free-hands:run`, Codex read the skill file; both wrote the goal file and
  `hello.txt` and ended `done`. "아니" → no goal file, no `hello.txt`, directions offered (Claude) or a plain
  acknowledgement (Codex). "free-hands 플러그인이 무엇을 하는지 설명만 해줘" → an explanation, no entry question, no goal.
- **F07 — Codex's sandbox blocks the local git exclude.** Under `-s workspace-write`, writing `.git/info/exclude` failed
  (X02, X03 yes, X04 — the agents reported "read-only"), so `.free-hands/` showed in `git status`. Claude (C03 yes) wrote
  the exclude; `git status` listed only `hello.txt`.
- **F08 — Claude panel: five roles started, but the main tallied before all returned.** C04: five Agent calls with
  `subagent_type` `free-hands:<role>`, run as background tasks; `modelUsage` lists `claude-sonnet-5-5` and
  `claude-opus-5-5` (the families of the five roles); the roles used only Read, Glob and Grep (no Write, Edit, Bash or web
  tool); the main saved their replies as `round1/<role>.json`. It tallied with three replies while `deep-thinker` and
  `devils-advocate` were still running, recorded "panel degraded", decided A, then amended the record when the two
  arrived (both A). Round 2 was not reached (all agreed). Two late background-task notifications, which contain the
  text `free-hands:deep-thinker`, got the entry note after the goal was done. One "Stop hook error occurred" notice
  appeared; every free-hands Stop response exited 0, so its source was not identified.
- **F09 — Codex panel route (`panel.py run` started by the runner).** X06: five children, each header `sandbox:
  read-only`; `ran` = `gpt-6-luna` for quick-thinker, evidence-hunter, trend-tracker and `gpt-6.1-sol` for deep-thinker,
  devils-advocate, at the efforts `panel.py` sets; five valid replies, all A; tally `decide`. Child tokens (`tokens
  used` in each log): deep-thinker 72,100, devils-advocate 33,983, evidence-hunter 24,524, trend-tracker 33,099,
  quick-thinker 14,988. Web searches (`web search:` lines in the full logs, `evidence/x06-free-hands/`):
  evidence-hunter 2, trend-tracker 6 — and deep-thinker 10, devils-advocate 6 without `--search`, quick-thinker 0. Codex
  children can search the web by default; `--search` does not limit web use to the two web roles.
- **F10 — Codex native subagents (self-report, n=1).** X07: the model used `collaboration.spawn_agent` and reported
  passing `task_name`, `fork_turns`, `model`, `reasoning_effort` and `message`; read-only was asked for only in the message
  text. No parameter held the child read-only.
- **F11 — Codex `request_user_input` was not called.** X04 enabled `features.default_mode_request_user_input`; the prompt
  told the agent to use the tool, but it followed the never-ask note and did the item. The deny path was not exercised.
- **F12 — Claude runs SessionStart after `/compact`.** C02 turn 2: `compact_result: success`, then SessionStart hooks ran.
  The goal was already `done` (turn 1 finished the item), so no note was due; the note after a compaction with an active
  goal was not observed.

## Changes these findings call for (made in because-i-needed after this run; to be measured in a sibling)

- F03 → the guard treats `done`/`waiting` with open `- [ ]` items as active (blocks the stop, tells the agent to set
  `active`, mark `[-]`, or use `paused` for a stop request); the skill says a user's stop or wait request is `paused`.
- F07 → the skill writes `.free-hands/.gitignore` (`*`) instead of `.git/info/exclude`.
- F08 → the skill says to wait for every dispatched role before the tally (a running role is not missing; ten minutes
  without a reply is); the prompt hook ignores background-task notifications.
- F09, F10 → docs only: Codex children may search the web whatever the role; the native route is not used because it
  cannot be held read-only.

## Not measured

- Claude's `AskUserQuestion` deny: headless `claude -p` offers no AskUserQuestion tool (SPEC). Codex's
  `request_user_input` deny (F11).
- Release at `max_iterations` and a failed counter write at runtime (unit tests only; C04 reached 4 of 5).
- A role's write attempt being blocked — no role attempted one (C04 roles had no write tools; X06 children ran
  read-only sandboxes).
- Round 2 (every panel agreed), the restore note after compaction with an active goal (F12), a Codex main starting
  `panel.py run` itself (X06 was started by the runner; ux-ui R01 found a sandboxed Codex main could not start
  `codex exec`), Claude roles' web use (none searched), interactive `/hooks` trust, stacked PRs, the hard limits (rules
  only, no hook enforces them), and decision quality.
