#!/usr/bin/env bash
# real-skill-tco-1.6.0 runner (SPEC.md). 12 chains: {opus-5.5, fable-5.1} x {base-plan, plan-smith} x r1..r3.
# chain = plan (headless claude -p) -> implement (headless claude -p, Read/Write only), batches of 4 in parallel: r1 -> r2 -> r3.
# Every session runs in a fixture outside the repository ($TMPDIR); outputs are copied back and masked with ../scrub.py,
# and a stage only counts once the masked copy passes the sensitive-string check.
# State-aware (lab Art. 6): a stage whose evidence JSON is ok and whose output exists is skipped; a cut stage is moved to
# evidence/aborted/ (never deleted) before it reruns, and marked *.resumed.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
PLUGIN="$HERE/subject/plugins/plan-smith"
EV="$HERE/evidence"
FXROOT="${TMPDIR:-/tmp}/real-skill-tco-1.6.0"
SCRUB="$HERE/../scrub.py"
COMMON=(--effort xhigh --output-format json --strict-mcp-config --setting-sources project
        --settings "$HERE/inputs/settings.json" --permission-mode bypassPermissions)
mkdir -p "$EV" "$FXROOT"
caffeinate -ims -w $$ &          # background claude -p does not keep the host awake (real-skill-tco attempt 2)

notice() {
  printf '이 계획서의 구현자는 %s다. 구현자는 이 계획서 하나만 읽고, 파일을 읽고 쓰는 도구만으로\n작업한다(설치·빌드·실행·테스트 불가).' "$1"
}
base_prompt() { # $1 fixture, $2 model id
  printf '아래 요구사항 파일을 읽고, 이 게임을 구현하기 위한 계획서를 작성하라.\n\n- 요구사항: %s\n- 출력: %s/plan.md 에 Write\n\n%s\n\n계획서의 구성·분량·형식은 전부 네가 정한다.\n이 단계에서는 코드를 작성하지 않는다.' \
    "$1/game-prompt.md" "$1" "$(notice "$2")"
}
smith_prompt() { # $1 fixture, $2 model id
  printf '/plan-smith:forge 아래 요구사항 파일을 읽고, 이 게임을 구현하기 위한 계획서를 작성하라.\n\n- 요구사항: %s\n\n%s\n\n(사용자 확인 게이트가 나오면 배치 실행이므로 스스로 승인하고 진행한다.)\n이 단계에서는 코드를 작성하지 않는다.' \
    "$1/game-prompt.md" "$(notice "$2")"
}
impl_prompt() { # $1 plan path, $2 fixture — transfer/runner.js implPrompt wording
  printf '아래 계획서를 읽고, 그 계획대로 소스코드를 작성하라.\n\n- 계획서: %s\n- 출력: %s/result/ 아래에 Write (하위 경로를 포함해 Write하면 폴더는 자동 생성된다)\n\n파일 구성·개수·분량은 전부 네가 정한다.\n너에게는 파일을 읽고 쓰는 도구만 있다. 설치·빌드·실행·테스트는 할 수 없다.' \
    "$1" "$2"
}

ok_json()   { [ -s "$1" ] && python3 -c "import json,sys; sys.exit(0 if not json.load(open('$1')).get('is_error') else 1)" 2>/dev/null; }
limit_hit() { grep -qiE 'spend limit|usage limit|rate limit' "$1" 2>/dev/null; }
suspended() { # $1 raw stage json — any sleep or forced-resume trace in that session (subagents included)
  local sid f; sid=$(python3 -c "import json; print(json.load(open('$1')).get('session_id',''))" 2>/dev/null)
  [ -z "$sid" ] && return 1
  f=$(ls "$HOME"/.claude/projects/*/"$sid".jsonl 2>/dev/null | head -1); [ -z "$f" ] && return 1
  cat "$f" "${f%.jsonl}"/subagents/*.jsonl 2>/dev/null | grep -qE 'StreamSuspended|cut off mid-stream'
}
plan_file() { # $1 fixture, $2 arm
  if [ "$2" = base-plan ]; then [ -f "$1/plan.md" ] && echo "$1/plan.md"; else ls "$1"/plans/*/plan.md 2>/dev/null | head -1; fi
}
stash() { # $1 id, $2 stage, $3 cell, $4 fixture — move, never delete
  local dest; dest="$EV/aborted/$(date +%Y%m%d-%H%M%S)-$1-$2"; mkdir -p "$dest"
  for f in "$EV/${1}_$2".json "$EV/${1}_$2".err; do [ -e "$f" ] && mv -- "$f" "$dest/"; done
  if [ "$2" = plan ]; then
    for p in "$3/plan.md" "$3/plans" "$4/plan.md" "$4/plans"; do [ -e "$p" ] && mv -- "$p" "$dest/$(basename "$p").$(basename "$(dirname "$p")")"; done
  else
    for p in "$3/result" "$4/result"; do [ -e "$p" ] && mv -- "$p" "$dest/result.$(basename "$(dirname "$p")")"; done
  fi
  echo "$1 $2 -> ${dest#$HERE/}" >> "$EV/stashed.log"
}
publish() { # $1 id, $2 stage, $3 raw json, $4 raw stderr, $5.. paths to copy into the cell (already copied by caller)
  cp "$3" "$EV/${1}_$2.json"; cp "$4" "$EV/${1}_$2.err"
  if ! python3 "$SCRUB" "$EV/${1}_$2.json" "$EV/${1}_$2.err" "${@:5}" > "$EV/${1}_$2.scrub.txt" 2>&1; then
    touch "$EV/STOP"; echo "$1 $2: SENSITIVE LEFT after scrub" >> "$EV/errors.log"; return 1
  fi
  grep -q 'Unknown --effort' "$4" && echo "$1 $2: effort flag ignored" >> "$EV/errors.log"
  return 0
}

chain() { # $1 model dir, $2 model id, $3 arm, $4 rep
  local id=$1_$3_r$4 cell="$HERE/$1/$3/r$4" fx="$FXROOT/$1_$3_r$4" plan
  mkdir -p "$cell" "$fx"; [ -f "$fx/game-prompt.md" ] || cp "$HERE/inputs/game-prompt.md" "$fx/"
  # plan
  if ok_json "$EV/${id}_plan.json" && [ -n "$(plan_file "$fx" "$3")" ]; then :; else
    [ -e "$EV/STOP" ] && return
    if [ -e "$EV/${id}_plan.json" ] || [ -e "$fx/plan.md" ] || [ -d "$fx/plans" ]; then stash "$id" plan "$cell" "$fx"; touch "$EV/${id}_plan.resumed"; fi
    date +%s > "$fx/plan.start"
    if [ "$3" = base-plan ]; then
      (cd "$fx" && claude -p "$(base_prompt "$fx" "$2")" --model "$2" --tools "Read,Write,Glob,Grep,Agent,Skill,Bash" \
        "${COMMON[@]}" < /dev/null > "$fx/plan.json" 2> "$fx/plan.err")
    else
      (cd "$fx" && claude -p "$(smith_prompt "$fx" "$2")" --model "$2" --plugin-dir "$PLUGIN" --tools "Read,Write,Glob,Grep,Agent,Skill,Bash" \
        "${COMMON[@]}" < /dev/null > "$fx/plan.json" 2> "$fx/plan.err")
    fi
    date +%s > "$fx/plan.end"
    if [ "$3" = base-plan ]; then [ -f "$fx/plan.md" ] && cp "$fx/plan.md" "$cell/"; else [ -d "$fx/plans" ] && cp -R "$fx/plans" "$cell/"; fi
    publish "$id" plan "$fx/plan.json" "$fx/plan.err" "$cell" || return
    limit_hit "$EV/${id}_plan.json" && { touch "$EV/STOP"; echo "$id plan: LIMIT" >> "$EV/errors.log"; return; }
    suspended "$fx/plan.json" && { touch "$EV/${id}_plan.suspended"; echo "$id plan: SUSPENDED (측정 오염 — 재실행 대상)" >> "$EV/errors.log"; }
  fi
  plan=$(plan_file "$fx" "$3"); [ -z "$plan" ] && { echo "$id: NO PLAN FILE" >> "$EV/errors.log"; return; }
  # implement
  if ok_json "$EV/${id}_impl.json" && [ -n "$(find "$cell/result" -type f 2>/dev/null | head -1)" ]; then :; else
    [ -e "$EV/STOP" ] && return
    if [ -e "$EV/${id}_impl.json" ] || [ -d "$fx/result" ] || [ -d "$cell/result" ]; then stash "$id" impl "$cell" "$fx"; touch "$EV/${id}_impl.resumed"; fi
    date +%s > "$fx/impl.start"
    (cd "$fx" && claude -p "$(impl_prompt "$plan" "$fx")" --model "$2" --tools "Read,Write" \
      "${COMMON[@]}" < /dev/null > "$fx/impl.json" 2> "$fx/impl.err")
    date +%s > "$fx/impl.end"
    [ -d "$fx/result" ] && cp -R "$fx/result" "$cell/"
    publish "$id" impl "$fx/impl.json" "$fx/impl.err" "$cell" || return
    limit_hit "$EV/${id}_impl.json" && { touch "$EV/STOP"; echo "$id impl: LIMIT" >> "$EV/errors.log"; return; }
    suspended "$fx/impl.json" && { touch "$EV/${id}_impl.suspended"; echo "$id impl: SUSPENDED (측정 오염 — 재실행 대상)" >> "$EV/errors.log"; }
  fi
  echo "$id: done" >> "$EV/progress.log"
}

rm -f -- "$EV/STOP"; pids=()
for r in ${REPS:-1 2 3}; do
  for m in "opus-5.5 claude-opus-5-5" "fable-5.1 claude-fable-5-1"; do
    set -- $m
    for arm in base-plan plan-smith; do chain "$1" "$2" "$arm" "$r" & pids+=($!); done
  done
  wait "${pids[@]}"; pids=()     # chain PIDs only — a bare wait also waits on caffeinate and hangs
  echo "BATCH r$r RETURNED $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$EV/progress.log"
  [ -e "$EV/STOP" ] && { echo "STOPPED after batch r$r $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$EV/progress.log"; break; }
done
