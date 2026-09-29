#!/usr/bin/env bash
# env-probes-0.1.0 runner (SPEC.md). State-aware (z-lab Rule 6): a unit with DONE is skipped.
#
#   SENSITIVE_RE='<regex>' ./runner.sh            # every probe
#   SENSITIVE_RE='<regex>' ./runner.sh X01 X18    # only these
#
# SENSITIVE_RE (never stored in the repo) lists strings that must not be written here; a unit whose output
# matches is moved out to a temp dir and the run stops.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SUBJ="$HERE/subject"; AP="$SUBJ/plugins/claude-x-codex"; SCHEMA="$AP/skills/run/references/review.schema.json"
RUNS="$HERE/runs"; REPS="${REPS:-3}"
CM="${CLAUDE_MODEL:-haiku}"; XM="${CODEX_MODEL:-gpt-6-luna}"
: "${SENSITIVE_RE:?set SENSITIVE_RE — a regex of strings that must never be written into this repo}"
export CXC_MODE=off                          # every worker/reviewer call in the docs runs with this
export KEEP_PREFIXES="claude-x-codex" KEEP_MARKERS="[claude-x-codex"

FB=(-c 'project_doc_fallback_filenames=["CLAUDE.md"]')
ISO_CLAUDE=(--setting-sources project)
ISO_CODEX=(--ignore-user-config --ephemeral --json)
Q_CODEX='According to the project instruction files you were given, what codewords are defined? Reply with the codewords only, comma-separated, or NONE if you were given no project instructions. Do not read any files or run commands.'
Q_CLAUDE='According to the project instructions already in your context, what codewords are defined? Reply with the codewords only, comma-separated, or NONE.'
P_WRITE='First, create a file named x.txt containing the word hi (use any tool or shell command that works). Then review m.py for correctness bugs and return the review JSON.'
REVIEWER_TOOLS=("Read" "Grep" "Glob" "Bash(git diff:*)" "Bash(git log:*)")

now_ms() { python3 -c 'import time; print(int(time.time() * 1000))'; }
log() { printf '%s\n' "$*" >&2; }
unit() {                       # unit <dir>: 0 = run it (fresh dir), 1 = already DONE
  if [ -f "$1/DONE" ]; then log "skip ${1#"$RUNS"/}"; return 1; fi
  rm -rf "$1"; mkdir -p "$1"; log "run  ${1#"$RUNS"/}"; return 0
}
finish() {                     # finish <dir>: sensitive-string gate, then DONE
  if grep -rqiE "$SENSITIVE_RE" "$1" 2>/dev/null; then
    local q; q="$(mktemp -d)/quarantine"; mv "$1" "$q"
    log "SENSITIVE STRING in output — unit moved to $q; stopping"; exit 3
  fi
  date -u +%Y-%m-%dT%H:%M:%SZ > "$1/DONE"
}
fixture() { local t; t="$(mktemp -d)/repo"; mkdir -p "$t"; git -C "$t" init -q; echo "$t"; }
put() { mkdir -p "$(dirname "$1/$2")"; printf '%s\n' "$3" > "$1/$2"; }
commit_all() { git -C "$1" add -A && git -C "$1" -c user.name=t -c user.email=t@t commit -qm fixture; }
listing() { (cd "$1" && find . -path ./.git -prune -o -type f -print | sort) > "$2"; }
div_py() { put "$1" m.py 'def div(a, b):
    return a / b'; }

# claude_p <dir> <prompt> [args…] — run from the current directory; filtered stream-json.
claude_p() {
  local d="$1" p="$2"; shift 2
  printf '%s\n' "$p" > "$d/prompt.txt"; printf '%q ' claude -p '<prompt.txt>' "$@" > "$d/cmd.txt"
  local t0 t1 rc; t0=$(now_ms)
  claude -p "$p" "$@" --output-format stream-json --verbose < /dev/null 2> "$d/stderr.txt" \
    | python3 "$HERE/filter_stream.py" > "$d/stream.jsonl"
  rc=${PIPESTATUS[0]}; t1=$(now_ms)
  echo "$rc" > "$d/exit"; echo $((t1 - t0)) > "$d/wall_ms"
}
# codex_x <dir> <prompt> [args…] — run from the current directory; JSONL events + last message.
codex_x() {
  local d="$1" p="$2"; shift 2
  printf '%s\n' "$p" > "$d/prompt.txt"; printf '%q ' codex exec "$@" -o last.txt '<prompt.txt>' > "$d/cmd.txt"
  local t0 t1 rc; t0=$(now_ms)
  codex exec "$@" -o "$d/last.txt" "$p" < /dev/null > "$d/events.jsonl" 2> "$d/stderr.txt"
  rc=$?; t1=$(now_ms)
  echo "$rc" > "$d/exit"; echo $((t1 - t0)) > "$d/wall_ms"
}
reps() { seq 1 "$REPS"; }

# ------------------------------------------------------------------ instruction files
p_X01() { local arm k d t extra
  for arm in fallback none; do for k in $(reps); do d="$RUNS/X01/$arm/r$k"; unit "$d" || continue
    t=$(fixture); put "$t" CLAUDE.md 'Project rule: the codeword for this repository is PINEAPPLE-42.'; commit_all "$t"
    extra=(); [ "$arm" = fallback ] && extra=("${FB[@]}")
    (cd "$t" && codex_x "$d" "$Q_CODEX" -m "$XM" -s read-only "${ISO_CODEX[@]}" ${extra[@]+"${extra[@]}"})
    listing "$t" "$d/fixture.txt"; finish "$d"; done; done; }
p_X02() { local k d t
  for k in $(reps); do d="$RUNS/X02/fallback/r$k"; unit "$d" || continue
    t=$(fixture); put "$t" CLAUDE.md 'Claude rule: the claude codeword is LEMON-1.'; put "$t" AGENTS.md 'Agents rule: the agents codeword is GRAPE-2.'; commit_all "$t"
    (cd "$t" && codex_x "$d" "$Q_CODEX" -m "$XM" -s read-only "${ISO_CODEX[@]}" "${FB[@]}")
    listing "$t" "$d/fixture.txt"; finish "$d"; done; }
p_X03() { local k d t
  for k in $(reps); do d="$RUNS/X03/fallback/r$k"; unit "$d" || continue
    t=$(fixture); put "$t" CLAUDE.md 'Root rule: the root codeword is ROOT-5.'; put "$t" sub/CLAUDE.md 'Sub rule: the sub codeword is SUB-6.'; put "$t" sub/app.txt 'app'; commit_all "$t"
    (cd "$t" && codex_x "$d" "$Q_CODEX" -m "$XM" -C "$t/sub" -s read-only "${ISO_CODEX[@]}" "${FB[@]}")
    listing "$t" "$d/fixture.txt"; finish "$d"; done; }
p_X04() { local k d t
  for k in $(reps); do d="$RUNS/X04/fallback/r$k"; unit "$d" || continue
    t=$(fixture); put "$t" CLAUDE.md 'Project rules are in @rules.md.'; put "$t" rules.md 'Rule: the codeword for this repository is IMPORT-8.'; commit_all "$t"
    (cd "$t" && codex_x "$d" "$Q_CODEX" -m "$XM" -s read-only "${ISO_CODEX[@]}" "${FB[@]}")
    listing "$t" "$d/fixture.txt"; finish "$d"; done; }
p_X05() { local k d t
  for k in $(reps); do d="$RUNS/X05/-/r$k"; unit "$d" || continue
    t=$(fixture); put "$t" AGENTS.md 'Project rule: the codeword for this repository is MANGO-7.'; commit_all "$t"
    (cd "$t" && claude_p "$d" "$Q_CLAUDE" "${ISO_CLAUDE[@]}" --tools "" --model "$CM" --max-turns 1)
    listing "$t" "$d/fixture.txt"; finish "$d"; done; }
p_X06() { local k d t
  for k in $(reps); do d="$RUNS/X06/-/r$k"; unit "$d" || continue
    t=$(fixture); put "$t" CLAUDE.md 'Claude rule: the claude codeword is LEMON-1.'; put "$t" AGENTS.md 'Agents rule: the agents codeword is GRAPE-2.'; commit_all "$t"
    (cd "$t" && claude_p "$d" "$Q_CLAUDE" "${ISO_CLAUDE[@]}" --tools "" --model "$CM" --max-turns 1)
    listing "$t" "$d/fixture.txt"; finish "$d"; done; }
p_X07() { local arm k d t sub
  for arm in nested-agents nested-claude; do for k in $(reps); do d="$RUNS/X07/$arm/r$k"; unit "$d" || continue
    t=$(fixture); put "$t" AGENTS.md 'Project rule: the codeword for this repository is MANGO-7.'
    if [ "$arm" = nested-agents ]; then sub=pkg; put "$t" pkg/AGENTS.md 'Package rule: the package codeword is KIWI-3.'
    else sub=lib; put "$t" lib/CLAUDE.md 'Lib rule: the lib codeword is PLUM-9.'; fi
    put "$t" "$sub/data.txt" 'hello'; commit_all "$t"
    (cd "$t" && claude_p "$d" "Use the Read tool to read $sub/data.txt. Then, without reading any other file, list every codeword defined in project instructions that are now in your context. Reply with the codewords only, comma-separated." \
      "${ISO_CLAUDE[@]}" --tools Read --model "$CM" --max-turns 3)
    listing "$t" "$d/fixture.txt"; finish "$d"; done; done; }

# ------------------------------------------------------------------ structured output
p_X08() { local k d t
  for k in $(reps); do d="$RUNS/X08/-/r$k"; unit "$d" || continue
    t=$(fixture); div_py "$t"; commit_all "$t"
    (cd "$t" && codex_x "$d" 'Review m.py for correctness bugs. Report findings only.' -m "$XM" -s read-only "${ISO_CODEX[@]}" --output-schema "$SCHEMA")
    finish "$d"; done; }
p_X09() { local k d t
  for k in $(reps); do d="$RUNS/X09/-/r$k"; unit "$d" || continue
    t=$(fixture); div_py "$t"; commit_all "$t"
    (cd "$t" && claude_p "$d" 'Review m.py for correctness bugs. Report findings only.' "${ISO_CLAUDE[@]}" --tools Read --model "$CM" --max-turns 4 --json-schema "$(cat "$SCHEMA")")
    finish "$d"; done; }

# ------------------------------------------------------------------ read-only reviewers
p_X10() { local arm k d t src
  for arm in isolated user; do for k in $(reps); do d="$RUNS/X10/$arm/r$k"; unit "$d" || continue
    t=$(fixture); div_py "$t"; commit_all "$t"; src=(); [ "$arm" = isolated ] && src=("${ISO_CLAUDE[@]}")
    (cd "$t" && claude_p "$d" "$P_WRITE" --model "$CM" --allowedTools "${REVIEWER_TOOLS[@]}" --json-schema "$(cat "$SCHEMA")" --max-turns 6 ${src[@]+"${src[@]}"})
    { [ -e "$t/x.txt" ] && echo "x_exists=yes" || echo "x_exists=no"; git -C "$t" status --porcelain | sed 's/^/status: /'; } > "$d/observe.txt"
    listing "$t" "$d/fixture.txt"; finish "$d"; done; done; }
p_X11() { local arm k d t iso
  for arm in isolated user; do for k in $(reps); do d="$RUNS/X11/$arm/r$k"; unit "$d" || continue
    t=$(fixture); div_py "$t"; commit_all "$t"
    if [ "$arm" = isolated ]; then iso=("${ISO_CODEX[@]}"); else iso=(--ephemeral --json); fi
    (cd "$t" && codex_x "$d" "$P_WRITE" -m "$XM" -s read-only "${FB[@]}" --output-schema "$SCHEMA" "${iso[@]}")
    { [ -e "$t/x.txt" ] && echo "x_exists=yes" || echo "x_exists=no"; git -C "$t" status --porcelain | sed 's/^/status: /'; } > "$d/observe.txt"
    listing "$t" "$d/fixture.txt"; finish "$d"; done; done; }

# ------------------------------------------------------------------ transport
p_X12() { local d t F wt base
  d="$RUNS/X12/-/r1"; unit "$d" || return 0
  t=$(fixture); put "$t" calc.py 'def add(a, b):
    """Return a + b."""
    return a + b'
  put "$t" CLAUDE.md 'Project rule: every function has a one-line docstring.'; commit_all "$t"
  base="$(git -C "$t" rev-parse --abbrev-ref HEAD)"; echo ".claude-x-codex/" >> "$t/.git/info/exclude"
  F="$t/.claude-x-codex/feat"; mkdir -p "$F/tasks" "$F/returns" "$F/reviews"; wt="$t/.claude-x-codex/wt/T1"
  git -C "$t" worktree add -q "$wt" -b cxc/feat/T1
  (cd "$t" && bash "$AP/scripts/worktree-setup.sh" "$wt") > "$d/worktree-setup.txt" 2>&1
  cat > "$F/tasks/T1.md" <<'TASK'
# Task T1: add mul
## Context
A tiny calculator module. This task adds multiplication next to the existing addition.
## Project context
Read before starting: CLAUDE.md (project rules).
## Scope
Files you may change: calc.py
Do not change: anything else
## Requirements
1. Add `mul(a, b)` to calc.py returning `a * b`.
## Done when
`python3 -c "import calc; assert calc.mul(3, 4) == 12"` exits 0.
## Return format
### Changed files
### Key decisions
### Uncertain
### Gate result
TASK
  local t0 t1; t0=$(now_ms)
  (cd "$t" && CXC_MODE=off codex exec -m "$XM" -C .claude-x-codex/wt/T1 -s workspace-write "${FB[@]}" \
     -o "$F/returns/T1.md" "${ISO_CODEX[@]}" "$(cat "$F/tasks/T1.md")" < /dev/null > "$d/worker.events.jsonl" 2> "$d/worker.stderr.txt")
  echo "$?" > "$d/worker.exit"; t1=$(now_ms); echo $((t1 - t0)) > "$d/worker.wall_ms"
  (cd "$wt" && python3 -c "import calc; assert calc.mul(3, 4) == 12" && echo gate=pass || echo gate=fail) > "$d/gate.txt" 2>&1
  git -C "$t" status --porcelain > "$d/main-tree-status.txt"
  git -C "$wt" add -A && git -C "$wt" -c user.name=t -c user.email=t@t commit -qm T1
  git -C "$t" diff "$base...cxc/feat/T1" > "$d/phase.diff"
  cat > "$F/reviews/p1-prompt.md" <<PROMPT
You are reviewing phase 1 of a feature, written by another model.
Read the project's instructions (CLAUDE.md), then review \`git diff $base...cxc/feat/T1 -- calc.py\`.
Judge against this project's rules, not general taste; a deliberate project convention is not a finding.
- Report findings only. Do not rewrite code that works.
Your lens: blocking correctness issues, then consistency with the project rules.
Output only JSON in the review schema.
PROMPT
  t0=$(now_ms)
  (cd "$t" && CXC_MODE=off codex exec -m "${REVIEW_MODEL:-gpt-6-sol}" -c model_reasoning_effort="high" -s read-only "${FB[@]}" \
     --output-schema "$SCHEMA" -o "$F/reviews/p1-r1.json" "${ISO_CODEX[@]}" "$(cat "$F/reviews/p1-prompt.md")" < /dev/null \
     > "$d/codex-reviewer.events.jsonl" 2> "$d/codex-reviewer.stderr.txt")
  echo "$?" > "$d/codex-reviewer.exit"; t1=$(now_ms); echo $((t1 - t0)) > "$d/codex-reviewer.wall_ms"
  t0=$(now_ms)
  (cd "$t" && CXC_MODE=off claude -p "$(cat "$F/reviews/p1-prompt.md")" --model "${CLAUDE_REVIEWER:-opus}" \
     --allowedTools "${REVIEWER_TOOLS[@]}" --json-schema "$(cat "$SCHEMA")" --output-format json "${ISO_CLAUDE[@]}" < /dev/null \
     > "$d/claude-reviewer.result.json" 2> "$d/claude-reviewer.stderr.txt")
  echo "$?" > "$d/claude-reviewer.exit"; t1=$(now_ms); echo $((t1 - t0)) > "$d/claude-reviewer.wall_ms"
  jq '.structured_output' "$d/claude-reviewer.result.json" > "$F/reviews/p1-r1-claude.json" 2> "$d/jq.stderr.txt"
  cp -R "$F" "$d/state"; listing "$wt" "$d/worktree-files.txt"
  git -C "$t" worktree remove --force "$wt"; finish "$d"; }
p_X13() { local k d t
  for k in $(reps); do d="$RUNS/X13/-/r$k"; unit "$d" || continue
    t=$(fixture); put "$t" calc.py 'def add(a, b):
    return a + b'; commit_all "$t"
    (cd "$t" && claude_p "$d" 'Edit calc.py to add a function mul(a, b) that returns a * b. Then run the shell command `ls` with the Bash tool and report its output.' \
      --model "$CM" --permission-mode acceptEdits "${ISO_CLAUDE[@]}" --max-turns 6)
    { grep -q 'def mul' "$t/calc.py" && echo "edited=yes" || echo "edited=no"; } > "$d/observe.txt"
    git -C "$t" diff > "$d/calc.diff"; finish "$d"; done; }
p_X14() { local arm d t wt
  for arm in relative absolute; do d="$RUNS/X14/$arm/r1"; unit "$d" || continue
    t=$(fixture); put "$t" a.txt 'a'; commit_all "$t"; wt="$t/wt"; git -C "$t" worktree add -q "$wt" -b w
    mkdir -p "$t/rel" "$wt/rel"
    local o="rel/out.txt"; [ "$arm" = absolute ] && o="$t/abs-out.txt"
    (cd "$t" && codex exec -m "$XM" -C wt -s read-only "${ISO_CODEX[@]}" -o "$o" 'Reply with the single word ok.' < /dev/null > "$d/events.jsonl" 2> "$d/stderr.txt"; echo "$?" > "$d/exit")
    printf '%s -o %s\n' "cwd=<repo> -C wt" "$o" > "$d/cmd.txt"
    { for f in "$t/rel/out.txt" "$wt/rel/out.txt" "$t/abs-out.txt"; do [ -f "$f" ] && echo "found: ${f#"$t"/}"; done; true; } > "$d/observe.txt"
    git -C "$t" worktree remove --force "$wt"; finish "$d"; done; }
p_X15() { local arm d t t0 t1
  for arm in pipe-open devnull; do d="$RUNS/X15/$arm/r1"; unit "$d" || continue
    t=$(fixture); put "$t" a.txt 'a'; commit_all "$t"
    t0=$(now_ms)
    if [ "$arm" = pipe-open ]; then
      (cd "$t" && sleep 15 | codex exec -m "$XM" -s read-only "${ISO_CODEX[@]}" -o "$d/last.txt" 'Reply with the single word ok.' > "$d/events.jsonl" 2> "$d/stderr.txt")
    else
      (cd "$t" && codex exec -m "$XM" -s read-only "${ISO_CODEX[@]}" -o "$d/last.txt" 'Reply with the single word ok.' < /dev/null > "$d/events.jsonl" 2> "$d/stderr.txt")
    fi
    t1=$(now_ms); echo $((t1 - t0)) > "$d/wall_ms"; echo "$arm" > "$d/cmd.txt"; finish "$d"; done; }
p_X16() { local arm d
  for arm in prompt-last prompt-first; do d="$RUNS/X16/$arm/r1"; unit "$d" || continue
    if [ "$arm" = prompt-last ]; then
      (cd "$(mktemp -d)" && claude -p --model "$CM" --allowedTools "Read" "Grep" 'Reply with the single word ok.' "${ISO_CLAUDE[@]}" --output-format json < /dev/null > "$d/stdout.txt" 2> "$d/stderr.txt"; echo "$?" > "$d/exit")
    else
      (cd "$(mktemp -d)" && claude -p 'Reply with the single word ok.' --model "$CM" --allowedTools "Read" "Grep" "${ISO_CLAUDE[@]}" --output-format json < /dev/null > "$d/stdout.txt" 2> "$d/stderr.txt"; echo "$?" > "$d/exit")
    fi
    echo "$arm" > "$d/cmd.txt"; finish "$d"; done; }
p_X17() { local arm d h
  for arm in legacy file; do d="$RUNS/X17/$arm/r1"; unit "$d" || continue
    h="$(mktemp -d)"
    if [ "$arm" = legacy ]; then printf '[profiles.cxc-review]\nmodel = "gpt-6-sol"\nsandbox_mode = "read-only"\n' > "$h/config.toml"
    else : > "$h/config.toml"; printf 'model = "gpt-6-sol"\nsandbox_mode = "read-only"\n' > "$h/cxc-review.config.toml"; fi
    (cd "$h" && ls -1 > "$d/codex-home.txt" && cat ./*.toml > "$d/toml.txt"
     CODEX_HOME="$h" perl -e 'alarm shift; exec @ARGV' 60 codex exec --strict-config --skip-git-repo-check --ephemeral -p cxc-review 'Reply ok.' < /dev/null > "$d/out.txt" 2>&1
     echo "$?" > "$d/exit")
    finish "$d"; done; }

# ------------------------------------------------------------------ mode note
p_X18() { local arm k d t
  for arm in on off; do for k in $(reps); do d="$RUNS/X18/$arm/r$k"; unit "$d" || continue
    t=$(fixture); commit_all "$t" 2>/dev/null || true
    (cd "$t" && export CXC_MODE="$arm" && claude_p "$d" 'Reply with the single word ok.' "${ISO_CLAUDE[@]}" --plugin-dir "$AP" --tools "" --model "$CM" --max-turns 1)
    finish "$d"; done; done; }

# ------------------------------------------------------------------ deterministic + static
p_S01() { local d; d="$RUNS/S01/-/r1"; unit "$d" || return 0
  SUBJ="$SUBJ" bash "$HERE/suite/cxc-tests.sh" > "$d/suite.log" 2>&1; echo "$?" > "$d/exit"; finish "$d"; }
p_O01() { local d; d="$RUNS/O01/-/r1"; unit "$d" || return 0
  orca --version > "$d/orca-version.txt" 2>&1
  orca orchestration worker-start --help 2>&1 | grep -n -E -- '--model|--effort|--setup|--worktree|permission|setting for new agent|Other agents' > "$d/worker-start-help.excerpt.txt"
  orca skills get orchestration --full 2>&1 | grep -n -E -- 'worker-start .*--model|--effort requires|no flag for it|gate-create|--setup run' > "$d/guide.excerpt.txt"
  finish "$d"; }

ALL="X01 X02 X03 X04 X05 X06 X07 X08 X09 X10 X11 X12 X13 X14 X15 X16 X17 X18 S01 O01"
for id in ${*:-$ALL}; do "p_$id"; done
log "done"
