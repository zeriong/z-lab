#!/usr/bin/env bash
# usage: run_one.sh <worktree> <A|B|C> <T1..T5> <rep>
set -uo pipefail
LAB=/tmp/precedent-lab; WT="$1"; COND="$2"; TASK="$3"; REP="$4"; ID="${COND}-${TASK}-r${REP}"
TDIR=$(python3 -c 'import json,sys; print(json.load(open("/tmp/precedent-lab/tasks.json"))[sys.argv[1]]["dir"])' "$TASK")
PROMPT=$(python3 -c 'import json,sys; print(json.load(open("/tmp/precedent-lab/tasks.json"))[sys.argv[1]]["prompt"])' "$TASK")
bash "$LAB/setup_condition.sh" "$WT" "$COND" "$TDIR" >> "$LAB/runs/setup.log"
START=$(date +%s); touch "$LAB/runs/$ID.start"; MD="${TMPDIR:-/tmp}"
( cd "$WT" && env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT perl -e 'alarm 1500; exec @ARGV' -- \
  claude -p "$PROMPT" --output-format stream-json --verbose --dangerously-skip-permissions \
  --max-turns 40 --max-budget-usd 4 --setting-sources project \
  --disallowedTools "Bash(git push:*)" "Bash(gh:*)" "Bash(git commit:*)" \
  > "$LAB/runs/$ID.jsonl" 2> "$LAB/runs/$ID.err" )
RC=$?; HOOKDIRS=$(find "$MD" -maxdepth 1 -type d -name "claude-precedent-*" -newer "$LAB/runs/$ID.start" 2>/dev/null | wc -l | tr -d " "); HOOKMARKS=$(find "$MD" -maxdepth 3 -type f -path "*claude-precedent-*" -newer "$LAB/runs/$ID.start" 2>/dev/null | wc -l | tr -d " ")
echo "exit=$RC wall=$(( $(date +%s) - START ))s hook_dirs=$HOOKDIRS hook_marks=$HOOKMARKS" > "$LAB/runs/$ID.meta"
# 조건 세팅 파일은 diff 에서 제외
git -C "$WT" diff -- . ':(exclude).claude/settings.json' ':(exclude).claude/critical-core.md' ':(exclude)CLAUDE.md' > "$LAB/diffs/$ID.diff"
git -C "$WT" status --short -- . ':(exclude).claude/settings.json' ':(exclude).claude/critical-core.md' ':(exclude)CLAUDE.md' > "$LAB/diffs/$ID.status"
echo "$ID done $(cat "$LAB/runs/$ID.meta") diff=$(wc -l < "$LAB/diffs/$ID.diff")lines"
