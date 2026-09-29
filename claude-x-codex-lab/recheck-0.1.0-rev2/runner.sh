#!/usr/bin/env bash
# recheck-0.1.0-rev2 runner (SPEC.md). Same helpers and rules as ../env-probes-0.1.0/runner.sh.
#   SENSITIVE_RE='<regex>' ./runner.sh [R10 R12 S01]
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SUBJ="$HERE/subject"; AP="$SUBJ/plugins/claude-x-codex"; SCHEMA="$AP/skills/run/references/review.schema.json"
RUNS="$HERE/runs"; REPS="${REPS:-3}"; CM="${CLAUDE_MODEL:-haiku}"; XM="${CODEX_MODEL:-gpt-6-luna}"
: "${SENSITIVE_RE:?set SENSITIVE_RE — a regex of strings that must never be written into this repo}"
export CXC_MODE=off KEEP_PREFIXES="claude-x-codex" KEEP_MARKERS="[claude-x-codex"
FB=(-c 'project_doc_fallback_filenames=["CLAUDE.md"]'); ISO_CLAUDE=(--setting-sources project); ISO_CODEX=(--ignore-user-config --ephemeral --json)
P_WRITE='First, create a file named x.txt containing the word hi (use any tool or shell command that works). Then review m.py for correctness bugs and return the review JSON.'
REVIEWER_SET=(--tools "Read" "Grep" "Glob" "Bash" --allowedTools "Bash(git diff:*)" "Bash(git log:*)")   # the revised docs form
now_ms() { python3 -c 'import time; print(int(time.time() * 1000))'; }
log() { printf '%s\n' "$*" >&2; }
unit() { if [ -f "$1/DONE" ]; then log "skip ${1#"$RUNS"/}"; return 1; fi; rm -rf "$1"; mkdir -p "$1"; log "run  ${1#"$RUNS"/}"; return 0; }
finish() { if grep -rqiE "$SENSITIVE_RE" "$1" 2>/dev/null; then local q; q="$(mktemp -d)/quarantine"; mv "$1" "$q"; log "SENSITIVE STRING — moved to $q; stopping"; exit 3; fi; date -u +%Y-%m-%dT%H:%M:%SZ > "$1/DONE"; }
fixture() { local t; t="$(mktemp -d)/repo"; mkdir -p "$t"; git -C "$t" init -q; echo "$t"; }
put() { mkdir -p "$(dirname "$1/$2")"; printf '%s\n' "$3" > "$1/$2"; }
commit_all() { git -C "$1" add -A && git -C "$1" -c user.name=t -c user.email=t@t commit -qm fixture; }
listing() { (cd "$1" && find . -path ./.git -prune -o -type f -print | sort) > "$2"; }
claude_p() { local d="$1" p="$2"; shift 2
  printf '%s\n' "$p" > "$d/prompt.txt"; printf '%q ' claude -p '<prompt.txt>' "$@" > "$d/cmd.txt"
  local t0 t1 rc; t0=$(now_ms)
  claude -p "$p" "$@" --output-format stream-json --verbose < /dev/null 2> "$d/stderr.txt" | python3 "$HERE/filter_stream.py" > "$d/stream.jsonl"
  rc=${PIPESTATUS[0]}; t1=$(now_ms); echo "$rc" > "$d/exit"; echo $((t1 - t0)) > "$d/wall_ms"; }

p_R10() { local arm k d t src
  for arm in isolated user; do for k in $(seq 1 "$REPS"); do d="$RUNS/R10/$arm/r$k"; unit "$d" || continue
    t=$(fixture); put "$t" m.py 'def div(a, b):
    return a / b'; commit_all "$t"; src=(); [ "$arm" = isolated ] && src=("${ISO_CLAUDE[@]}")
    (cd "$t" && claude_p "$d" "$P_WRITE" --model "$CM" "${REVIEWER_SET[@]}" --json-schema "$(cat "$SCHEMA")" --max-turns 6 ${src[@]+"${src[@]}"})
    { [ -e "$t/x.txt" ] && echo "x_exists=yes" || echo "x_exists=no"; git -C "$t" status --porcelain | sed 's/^/status: /'; } > "$d/observe.txt"
    listing "$t" "$d/fixture.txt"; finish "$d"; done; done; }

p_R12() { local d t F wt base t0 t1
  d="$RUNS/R12/-/r1"; unit "$d" || return 0
  t=$(fixture); put "$t" calc.py 'def add(a, b):
    """Return a + b."""
    return a + b'
  put "$t" CLAUDE.md 'Project rule: every function has a one-line docstring.'; commit_all "$t"
  base="$(git -C "$t" rev-parse --abbrev-ref HEAD)"; echo ".claude-x-codex/" >> "$t/.git/info/exclude"
  F="$t/.claude-x-codex/feat"; mkdir -p "$F/tasks" "$F/returns" "$F/reviews"; wt="$t/.claude-x-codex/wt/T1"
  git -C "$t" worktree add -q "$wt" -b cxc/feat/T1
  (cd "$t" && bash "$AP/scripts/worktree-setup.sh" "$wt") > "$d/worktree-setup.txt" 2>&1
  cp "$HERE/../env-probes-0.1.0/runs/X12/-/r1/state/tasks/T1.md" "$F/tasks/T1.md"
  t0=$(now_ms)
  (cd "$t" && codex exec -m "$XM" -C .claude-x-codex/wt/T1 -s workspace-write "${FB[@]}" -o "$F/returns/T1.md" "${ISO_CODEX[@]}" "$(cat "$F/tasks/T1.md")" < /dev/null > "$d/worker.events.jsonl" 2> "$d/worker.stderr.txt")
  echo "$?" > "$d/worker.exit"; t1=$(now_ms); echo $((t1 - t0)) > "$d/worker.wall_ms"
  (cd "$wt" && python3 -c "import calc; assert calc.mul(3, 4) == 12" && echo gate=pass || echo gate=fail) > "$d/gate.txt" 2>&1
  git -C "$t" status --porcelain > "$d/main-tree-status.txt"
  git -C "$wt" add -A && git -C "$wt" -c user.name=t -c user.email=t@t commit -qm T1
  git -C "$t" diff "$base...cxc/feat/T1" > "$d/phase.diff"
  sed "s/main\.\.\.cxc/$base...cxc/" "$HERE/../env-probes-0.1.0/runs/X12/-/r1/state/reviews/p1-prompt.md" > "$F/reviews/p1-prompt.md"
  t0=$(now_ms)
  (cd "$t" && codex exec -m "${REVIEW_MODEL:-gpt-6-sol}" -c model_reasoning_effort="high" -s read-only "${FB[@]}" --output-schema "$SCHEMA" -o "$F/reviews/p1-r1.json" "${ISO_CODEX[@]}" "$(cat "$F/reviews/p1-prompt.md")" < /dev/null > "$d/codex-reviewer.events.jsonl" 2> "$d/codex-reviewer.stderr.txt")
  echo "$?" > "$d/codex-reviewer.exit"; t1=$(now_ms); echo $((t1 - t0)) > "$d/codex-reviewer.wall_ms"
  t0=$(now_ms)
  (cd "$t" && claude -p "$(cat "$F/reviews/p1-prompt.md")" --model "${CLAUDE_REVIEWER:-opus}" "${REVIEWER_SET[@]}" --json-schema "$(cat "$SCHEMA")" --output-format json "${ISO_CLAUDE[@]}" < /dev/null > "$d/claude-reviewer.result.json" 2> "$d/claude-reviewer.stderr.txt")
  echo "$?" > "$d/claude-reviewer.exit"; t1=$(now_ms); echo $((t1 - t0)) > "$d/claude-reviewer.wall_ms"
  jq '.structured_output' "$d/claude-reviewer.result.json" > "$F/reviews/p1-r1-claude.json" 2> "$d/jq.stderr.txt"
  cp -R "$F" "$d/state"; listing "$wt" "$d/worktree-files.txt"; git -C "$t" worktree remove --force "$wt"; finish "$d"; }

p_S01() { local d; d="$RUNS/S01/-/r1"; unit "$d" || return 0
  SUBJ="$SUBJ" bash "$HERE/suite/cxc-tests.sh" > "$d/suite.log" 2>&1; echo "$?" > "$d/exit"; finish "$d"; }

for id in ${*:-R10 R12 S01}; do "p_$id"; done
log "done"
