#!/usr/bin/env bash
# recheck-0.1.0-rev3 runner (SPEC.md). State-aware.   SENSITIVE_RE='<regex>' ./runner.sh
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; RUNS="$HERE/runs"; SUBJ="$HERE/subject"
SCHEMA="$SUBJ/plugins/claude-x-codex/skills/run/references/review.schema.json"; R12="$HERE/../recheck-0.1.0-rev2/runs/R12/-/r1"
: "${SENSITIVE_RE:?set SENSITIVE_RE}"
export CXC_MODE=off
now_ms() { python3 -c 'import time; print(int(time.time() * 1000))'; }
done_or_fail() { if grep -rqiE "$SENSITIVE_RE" "$1"; then q="$(mktemp -d)/quarantine"; mv "$1" "$q"; echo "SENSITIVE — moved to $q" >&2; exit 3; fi; date -u +%Y-%m-%dT%H:%M:%SZ > "$1/DONE"; }
d="$RUNS/C12/-/r1"
if [ ! -f "$d/DONE" ]; then rm -rf "$d"; mkdir -p "$d"; echo "run  C12" >&2
  t="$(mktemp -d)/repo"; mkdir -p "$t"; git -C "$t" init -q
  printf 'def add(a, b):\n    """Return a + b."""\n    return a + b\n' > "$t/calc.py"; echo 'Project rule: every function has a one-line docstring.' > "$t/CLAUDE.md"
  git -C "$t" add -A && git -C "$t" -c user.name=t -c user.email=t@t commit -qm fixture; base="$(git -C "$t" rev-parse --abbrev-ref HEAD)"
  git -C "$t" switch -q -c cxc/feat/T1 && git -C "$t" apply "$R12/phase.diff" && git -C "$t" add -A && git -C "$t" -c user.name=t -c user.email=t@t commit -qm T1 && git -C "$t" switch -q "$base"
  git -C "$t" diff "$base...cxc/feat/T1" > "$d/phase.diff"; cmp -s "$d/phase.diff" "$R12/phase.diff" && echo same > "$d/phase-matches-R12.txt" || echo DIFFERENT > "$d/phase-matches-R12.txt"
  sed "s/main\.\.\.cxc/$base...cxc/" "$R12/state/reviews/p1-prompt.md" > "$d/p1-prompt.md"
  t0=$(now_ms)
  (cd "$t" && claude -p "$(cat "$d/p1-prompt.md")" --model "${CLAUDE_REVIEWER:-opus}" \
     --allowedTools "Read" "Grep" "Glob" "Bash(git diff:*)" "Bash(git log:*)" \
     --disallowedTools "Skill" "ReportFindings" "Write" "Edit" "NotebookEdit" \
     --json-schema "$(cat "$SCHEMA")" --output-format json --setting-sources project < /dev/null > "$d/claude-reviewer.result.json" 2> "$d/claude-reviewer.stderr.txt")
  echo "$?" > "$d/claude-reviewer.exit"; t1=$(now_ms); echo $((t1 - t0)) > "$d/claude-reviewer.wall_ms"
  jq '.structured_output' "$d/claude-reviewer.result.json" > "$d/p1-r1-claude.json"; done_or_fail "$d"; fi
d="$RUNS/S01/-/r1"
if [ ! -f "$d/DONE" ]; then rm -rf "$d"; mkdir -p "$d"; echo "run  S01" >&2
  SUBJ="$SUBJ" bash "$HERE/suite/cxc-tests.sh" > "$d/suite.log" 2>&1; echo "$?" > "$d/exit"; done_or_fail "$d"; fi
echo done >&2
