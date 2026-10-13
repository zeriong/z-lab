#!/usr/bin/env bash
# usage: run_one.sh <P-hi|P-xh|G-hi|G-xh> <T1..T5|probe> <rep> [prompt-override]
set -uo pipefail
ARM="$1"; TASK="$2"; REP="$3"; OVERRIDE="${4:-}"
BASE=/Users/jeonjelyong/.cache/precedent-lab/plan-rail
LAB=/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/precedent-lab/plan-rail-2.1.296
case "$ARM" in P-hi) C=R; EF=high ;; P-xh) C=I; EF=xhigh ;; G-hi) C=L; EF=high ;; G-xh) C=G; EF=xhigh ;; esac
WT=/Users/jeonjelyong/.cache/precedent-lab/real-env-rail/wt-$C
ID="${RUN_ID_PREFIX:-}${ARM}-${TASK}-r${REP}"
mkdir -p "$BASE"/{runs,diffs,logs,tmp}
if [ -n "$OVERRIDE" ]; then PROMPT="$OVERRIDE"; else
  PROMPT=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))[sys.argv[2]]["prompt"])' "$LAB/tasks.json" "$TASK"); fi
bash "$LAB/setup_condition.sh" "$ARM" >> "$BASE/logs/setup.log" 2>&1
RT="$BASE/tmp/$ID"; rm -rf "$RT"; mkdir -p "$RT"
START=$(date +%s)
( cd "$WT" && env -i HOME="$HOME" USER="$USER" LOGNAME="$USER" SHELL=/bin/zsh TERM=xterm-256color LANG=en_US.UTF-8 \
    TMPDIR="$RT/" PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" \
    PRECEDENT_LAB_LOG="$BASE/logs/$ID.hook.jsonl" \
    perl -e 'alarm 1500; exec @ARGV' -- \
    claude -p "$PROMPT" --output-format stream-json --verbose --dangerously-skip-permissions \
      --max-turns 40 --max-budget-usd 4 --effort "$EF" \
      --disallowedTools "Bash(git commit:*)" "Bash(git push:*)" "Bash(gh:*)" "Bash(pnpm:*)" "Bash(npm:*)" "Bash(npx:*)" \
        "Bash(codex:*)" "Bash(orca:*)" mcp__plugin_chrome-devtools-mcp_chrome-devtools mcp__plugin_ux-ui_chrome-devtools \
        mcp__plugin_ux-ui_mobile-mcp mcp__plugin_ux-ui_ios-simulator mcp__claude-in-chrome \
    < /dev/null > "$BASE/runs/$ID.jsonl" 2> "$BASE/runs/$ID.err" )
RC=$?
INJ=$(find "$RT" -type f -path '*claude-precedent-inject-*' -name 'r-*' 2>/dev/null | wc -l | tr -d ' ')
DENY=$(grep -c '"gate": "deny' "$BASE/logs/$ID.hook.jsonl" 2>/dev/null || true)
echo "exit=$RC wall=$(( $(date +%s) - START ))s inject_marks=$INJ gate_denies=${DENY:-0}" > "$BASE/runs/$ID.meta"
EXC=(':(exclude).claude/settings.json' ':(exclude)CLAUDE.md')
git -C "$WT" diff -- . "${EXC[@]}" > "$BASE/diffs/$ID.diff"
git -C "$WT" status --short -- . "${EXC[@]}" ':(exclude).claude/hooks/precedent-inject.py' ':(exclude).claude/hooks/precedent-write-gate.py' > "$BASE/diffs/$ID.status"
echo "$ID done $(cat "$BASE/runs/$ID.meta") diff=$(wc -l < "$BASE/diffs/$ID.diff")lines"
