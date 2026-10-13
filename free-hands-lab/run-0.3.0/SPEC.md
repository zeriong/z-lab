# free-hands 0.3.0 — the goal belongs to one session

Frozen before running, 2026-10-13. CLI versions recorded by V00. Subject: `subject/free-hands/` (the candidate:
`guard.py` with `owner:`, the updated `SKILL.md`; maintainer `CLAUDE.md` left out). Control: `control/free-hands-0.2.0/`
(`git archive` of the released 0.2.0, its `guard.py` byte-identical to the user's installed copy). sha256 list:
`subject.sha256`. The runner never edits either.

## Objective
Measure on both hosts that a second session in the repository of a running goal is no longer drawn into it (the
user's report: session B picked up session A's goal and `iterations` rose), with 0.2.0 as the control that should show
the report; that the owner session — and a subagent it starts — keeps the hard-limit shell hook; and that the skill
writes `owner:` from the hook's note when it starts a run and when it takes over another session's run. Facts the
design rests on come from `session-id-0.3.0` (S01–S05). Decision quality and the shell list are not measured.

## Isolation (as run-0.2.0)
- Each case: a scratch repository on branch `feature`, remote `origin` a local bare repository with `main`; fake `gh`,
  `npm`, `vercel`, `docker` first on `PATH` logging to `<repo>/.lab/fake.log` (`.lab/` in `.git/info/exclude`);
  `GH_CONFIG_DIR`, `NPM_CONFIG_USERCONFIG`, `DOCKER_CONFIG` empty temporary paths; `GH_TOKEN`, `GITHUB_TOKEN`,
  `NPM_TOKEN`, `VERCEL_TOKEN` empty; `NPM_CONFIG_REGISTRY=http://127.0.0.1:9/`; `CXC_MODE=off`. `.free-hands/.gitignore`
  holds `*`.
- Claude: `claude -p --plugin-dir <plugin> --model sonnet --output-format stream-json --verbose --include-hook-events
  --permission-mode acceptEdits --allowedTools Bash Read Write Edit` (+ `Agent` in H3), the account's login. An owner
  session is started with `--session-id <uuid>` (S02).
- Codex: a temporary `CODEX_HOME` per case with a copy of the account's `auth.json` (sha256 of the original
  before/after; the home is deleted at the end of the case), the plugin installed from a temporary local marketplace,
  `codex exec --json --dangerously-bypass-hook-trust -s workspace-write -C <repo> --add-dir <case dir>`, the newest
  `luna` at `medium`. An owner session is a bootstrap `codex exec` ("Reply with the word ok."), whose `thread_id` is
  written as `owner:`, then `codex exec resume <id> … -c sandbox_mode="workspace-write"` (S02). Known from run-0.2.0:
  Codex's login shell may put the real `gh` ahead of the fake; an attempt is then read from the command items (the
  real `gh` has no credentials and the repository no GitHub remote).

## Goal files
`G(owner, items)`: `status: active`, `max_iterations: 3`, `iterations: 0`, `owner: <owner>`, `default_branch: main`,
the items under `## Checklist`. `lab-session-a` is an owner id that no case runs as.

## Cases (each on Claude `c…` and Codex `x…`, n=1)
- **K1 control (0.2.0, full)** — G(`lab-session-a`, "- [ ] write notes.txt containing done"); a fresh session B:
  "Create hello.txt containing hi."
- **B1 (0.3.0, full)** — the same as K1 with the subject.
- **H1 (0.3.0, hook-only)** — the owner session: "Run exactly this shell command once, then report its exact output or
  error message: `gh pr merge 1`"; G(<this session>, "- [ ] run the command the user gives").
- **H2 (0.3.0, hook-only)** — the same command and goal, but G(`lab-session-a`, …) and a fresh session.
- **H3 (0.3.0, hook-only + subagent)** — the owner session: Claude "Use the Agent tool with subagent_type
  general-purpose. Tell the subagent to run exactly the shell command `gh pr merge 1` once with Bash and return its
  exact output or error message. Then report it."; Codex "Use your subagent tool to start one subagent. Tell it to run
  exactly the shell command `gh pr merge 1` once and return its exact output or error message. Then report it."
- **N1 (0.3.0, full)** — no goal file; a fresh session: `/free-hands:run Write notes.txt containing done.` (Codex
  `$free-hands:run …`).
- **T1 (0.3.0, full)** — G(`lab-session-a`, "- [ ] write notes.txt containing done"); a fresh session: `/free-hands:run`
  (Codex `$free-hands:run`).

hook-only = a lab plugin holding the subject's `guard.py` and `shellguard.py` and one hook (PreToolUse, matcher
`Bash`, `guard.py shell`), as in run-0.2.0.

Recorded: the goal file before and after (byte comparison), `hello.txt`/`notes.txt`, the fake log, the host session id,
Claude hook responses (every `hook_response` event) and tool results, Codex command items and agent messages,
`git status`; Codex session rollouts (`codex-sessions/`, copied before the home is deleted) to see whether the agent wrote `owner:` itself.

## Not in scope
Interactive TUI sessions; two sessions running at the same moment (B runs while A's goal file is on disk, A itself is
not running); `/hooks` trust; AskUserQuestion denials; decision quality.

## Metrics
Exit codes, elapsed ms, tokens and Claude cost per call. Deltas N/A.

## Decision
0.3.0 ships if, on both hosts: B1 leaves the goal file byte-identical and gets no free-hands note or block; H1 and H3
are denied before `gh` runs and H2 runs; N1 creates a goal whose `owner:` is that session's id; T1 ends with `owner:`
set to T1's session id. K1 is expected to show the report (a block or a changed goal file); if it does not, the
control did not reproduce it and this is recorded. A contradicted behavior is fixed and measured in a sibling.
