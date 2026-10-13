#!/usr/bin/env bash
# usage: run_one.sh <R|I|L|G> <T1..R2|ok> <rep> [extra claude args...]
#   과제 'ok' 는 P0 상주 계측(과제 없음). 런 ID 는 <arm>-<task>-r<rep> (P0 는 run_p0.sh 가 접두를 붙인다).
set -uo pipefail
ARM="$1"; TASK="$2"; REP="$3"; shift 3; EXTRA=("$@")
BASE=/Users/jeonjelyong/.cache/precedent-lab/real-env-rail
LAB=/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/precedent-lab/real-env-rail-2.1.296
WT="$BASE/wt-$ARM"; ID="${RUN_ID_PREFIX:-}${ARM}-${TASK}-r${REP}"
if [ "$TASK" = ok ]; then
  PROMPT="Reply with exactly: ok"
else
  PROMPT=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))[sys.argv[2]]["prompt"])' "$LAB/tasks.json" "$TASK")
fi
bash "$LAB/setup_condition.sh" "$ARM" >> "$BASE/logs/setup.log" 2>&1
RT="$BASE/tmp/$ID"; rm -rf "$RT"; mkdir -p "$RT"
START=$(date +%s)
( cd "$WT" && env -i HOME="$HOME" USER="$USER" LOGNAME="$USER" SHELL=/bin/zsh TERM=xterm-256color LANG=en_US.UTF-8 \
    TMPDIR="$RT/" PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" \
    PRECEDENT_LAB_LOG="$BASE/logs/$ID.hook.jsonl" \
    perl -e 'alarm 1500; exec @ARGV' -- \
    claude -p "$PROMPT" --output-format stream-json --verbose --dangerously-skip-permissions \
      --max-turns 40 --max-budget-usd 4 ${EXTRA[@]+"${EXTRA[@]}"} \
      --disallowedTools "Bash(git commit:*)" "Bash(git push:*)" "Bash(gh:*)" "Bash(pnpm:*)" "Bash(npm:*)" "Bash(npx:*)" \
        "Bash(codex:*)" "Bash(orca:*)" mcp__plugin_chrome-devtools-mcp_chrome-devtools mcp__plugin_ux-ui_chrome-devtools \
        mcp__plugin_ux-ui_mobile-mcp mcp__plugin_ux-ui_ios-simulator mcp__claude-in-chrome \
    < /dev/null > "$BASE/runs/$ID.jsonl" 2> "$BASE/runs/$ID.err" )
RC=$?
MARKS=$(find "$RT" -type f -path '*claude-precedent-*' -not -path '*claude-precedent-inject-*' -name 'r-*' 2>/dev/null | wc -l | tr -d ' ')
INJ=$(find "$RT" -type f -path '*claude-precedent-inject-*' -name 'r-*' 2>/dev/null | wc -l | tr -d ' ')
echo "exit=$RC wall=$(( $(date +%s) - START ))s orig_hook_read_marks=$MARKS inject_marks=$INJ" > "$BASE/runs/$ID.meta"
EXC=(':(exclude).claude/settings.json' ':(exclude)CLAUDE.md')
git -C "$WT" diff -- . "${EXC[@]}" > "$BASE/diffs/$ID.diff"
git -C "$WT" status --short -- . "${EXC[@]}" ':(exclude).claude/hooks/precedent-inject.py' > "$BASE/diffs/$ID.status"
echo "$ID done $(cat "$BASE/runs/$ID.meta") diff=$(wc -l < "$BASE/diffs/$ID.diff")lines"
