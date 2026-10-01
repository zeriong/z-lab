# free-hands 0.1.0 — the guard and the panel, run on both hosts

Frozen before running, 2026-10-01. Claude Code 2.1.286, Codex CLI 0.159.3, macOS. Subject: `subject/free-hands/`, a copy of
because-i-needed `plugins/free-hands/` taken before the run (its sha256 list is `subject.sha256`); the runner never
edits it.

## Objective
Measure the behaviors the 0.1.0 release relies on (because-i-needed plan D11, user scope "essential behaviors only"):
the hook guard, the entry routing and the brainstorming panel, each on Claude Code and on Codex. No claim about
decision quality is measured.

## Method
- Each case runs in its own temporary git repository (`$TMPDIR/free-hands-lab-<case>/repo`), with its goal file
  written by the runner when the case needs one.
- **Claude Code**: `claude -p <prompt> --plugin-dir subject/free-hands --model sonnet --output-format stream-json
  --verbose --include-hook-events`, with the account's normal login (the only way to get model turns here; no settings
  file is written — `--plugin-dir` loads the plugin for that process only). `CXC_MODE=off` so the installed
  claude-x-codex hook stays silent. Follow-up turns use `--resume <session id>`.
- **Codex**: a temporary `CODEX_HOME` holding a copy of the account's `auth.json` (its sha256 is recorded before and
  after) and the subject installed from a temporary local marketplace (`codex plugin marketplace add <dir>`,
  `codex plugin add free-hands@<name>`). `codex exec --json --dangerously-bypass-hook-trust` so the plugin's hooks run
  without the interactive `/hooks` trust step (precedent: ux-ui-lab/codex-compat-1.3.0 runtime-gate). Main model: the
  resolver's newest `luna`, effort `medium`. Follow-up turns use `codex exec resume <thread id>`.
- Recorded per call: argv, cwd, exit, elapsed ms, stdout (events), stderr; after each case: the goal file, `git status`,
  the files the case names. Tokens: Claude result `usage`; Codex `turn.completed` usage.
- Codex `exec --json` does not print hook events, so Codex hook effects are read from their results: the goal file's
  `iterations`, the number of `turn.started` events, files created, and the agent's messages.

## Cases
Goal file "G(max, items)" = `status: active`, `max_iterations: <max>`, `iterations: 0`, and the listed items.

- V00 `claude --version`, `codex --version`.
- C01 Claude stop guard. G(2, `- [ ] write a.txt containing 1`, `- [ ] write b.txt containing 2`, `- [ ] write c.txt with
  the content the user gives you`). Prompt: "Read .free-hands/goal.md. Do only the first item, then stop and wait for
  my approval." Record Stop hook responses (block JSON and reason), the final `iterations`, files, final status, and
  whether the run ended at max.
- C02 Claude restore note. G(5, `- [ ] write a.txt containing 1`). Turn 1 prompt "Reply with the word ok only." →
  SessionStart and UserPromptSubmit hook outputs. Turn 2 `--resume` with prompt `/compact` → hook outputs.
- C03 Claude entry. No goal file. C03a prompt "free-hands로 hello.txt 파일에 hi 라고 써줘" → the UserPromptSubmit
  output and the reply; `--resume` with "응" → whether the skill `free-hands:run` is invoked, the goal file, hello.txt,
  final status. C03b the same first prompt, then "아니" → no goal file, no hello.txt. C03c "free-hands 플러그인이
  무엇을 하는지 설명만 해줘" → whether the reply asks the entry question, no goal file.
- C04 Claude panel. G(5, `- [ ] decide the CLI library for tools/report.py and write the decision under ## Decisions`)
  plus `.free-hands/panel/01-cli/brief.json` (question: which library for a new small Python CLI in this repository;
  options A argparse, B click, C typer; goal and constraints as the skill describes). Prompt: "Follow step 4 of the
  free-hands skill for .free-hands/panel/01-cli/brief.json, record the decision, mark the item done, then stop."
  Record: Agent calls and their `subagent_type`, `panel.py` calls (models, tally), round directories and replies,
  whether round 2 ran, the Decisions entry, `modelUsage` ids, tool calls inside the roles (any Write/Edit/Bash), web
  tool calls by evidence-hunter/trend-tracker, the goal's `iterations`. A split cannot be forced; if round 1 agrees,
  round 2 is recorded as not exercised.
- X01 Codex stop guard. As C01 with `codex exec`.
- X02 Codex restore note. As C02's turn 1 with `codex exec`; turn 2 `codex exec resume <thread>` "Reply with ok
  only." Whether the reply or behavior shows the note (Codex does not print the injected context): the prompt asks
  "Reply with ok, then, on a new line, the first word of any context note that starts with [free-hands" — recorded as
  the agent's report, labelled self-report.
- X03 Codex entry. As C03a/C03b/C03c with `codex exec` and `codex exec resume`.
- X04 Codex `request_user_input`. G(5, `- [ ] write a.txt containing 1`) with `-c
  features.default_mode_request_user_input=true`; prompt "Use the request_user_input tool to ask me which number to
  write, then do the item." Record whether the tool exists, whether a PreToolUse deny reached it, and the outcome.
- X05 Codex children and FREE_HANDS_ROLE. G(5, `- [ ] never mind`) in the repo. X05a `codex exec
  --dangerously-bypass-hook-trust "Reply with ok only."` with `FREE_HANDS_ROLE=deep-thinker` → `iterations` must stay 0.
  X05b the same without `FREE_HANDS_ROLE` → `iterations` after it (shows whether a child's Stop hook would touch the
  parent goal).
- X06 Codex panel route. `python3 subject/free-hands/scripts/panel.py run <dir>/round1 --brief <C04's brief>` run by
  the runner (not from a Codex main), `CODEX_HOME` as above, then `panel.py tally … --attempt 1`. Record each role's
  start, exit, `ran` model, reply validity, `--search` use for the web roles, and the tally.
- X07 Codex native subagents (exploratory, n=1). Prompt: "Use your subagent tool, if you have one, to start one
  read-only subagent on the smallest model you can choose and have it reply 'pong'. Report the tool name and every
  parameter you passed." Recorded as a self-report plus the event log; it decides only whether the README may point
  to a native route.

## Not in scope
- Claude's interactive `AskUserQuestion` deny: headless `claude -p` offers no AskUserQuestion tool (design probe,
  2026-10-01: the init tool list had 22 tools, AskUserQuestion not among them). Recorded as not measured.
- The interactive Codex `/hooks` trust step, stacked-PR handling on GitHub, decision quality, plugin installation through
  the because-i-needed marketplace URL.

## Metrics
Exit codes, elapsed ms and tokens per call. Deltas N/A.

## Decision
The release (because-i-needed free-hands 0.1.0) states only what FINDINGS measured; contradicted behavior is fixed and
re-measured in a sibling.
