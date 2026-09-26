#!/usr/bin/env bash
# real-skill-tco 실행 스크립트 — 12체인: {opus-5.5, fable-5.1} × {base-plan, plan-smith} × r1..r3.
# 체인 = 계획(헤드리스 claude -p) → 구현(헤드리스 claude -p, Read/Write만).
# 실행 순서(2차 시도부터): 동시 4체인 배치 r1 → r2 → r3. 지출 한도 감지 시 evidence/STOP 을 만들고 새 단계를 띄우지 않는다.
# 상태 인지형(제6조): evidence/ 의 CLI JSON과 산출물이 모두 있는 단계는 건너뛴다. 재개분은 evidence/*.resumed 로 표시.
set -u
R=/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco
PD=$HOME/.claude/plugins/cache/plan-smith-marketplace/plan-smith/1.4.2
GAME=$R/inputs/game-prompt.md
EV=$R/evidence
COMMON=(--effort xhigh --output-format json --strict-mcp-config --setting-sources user --permission-mode bypassPermissions)
mkdir -p "$EV"

notice() {
  printf '이 계획서의 구현자는 %s다. 구현자는 이 계획서 하나만 읽고, 파일을 읽고 쓰는 도구만으로\n작업한다(설치·빌드·실행·테스트 불가).' "$1"
}

base_prompt() { # $1 cell dir, $2 model id
  printf '아래 요구사항 파일을 읽고, 이 게임을 구현하기 위한 계획서를 작성하라.\n\n- 요구사항: %s\n- 출력: %s/plan.md 에 Write\n\n%s\n\n계획서의 구성·분량·형식은 전부 네가 정한다.\n이 단계에서는 코드를 작성하지 않는다.' \
    "$GAME" "$1" "$(notice "$2")"
}

smith_prompt() { # $1 model id
  printf '/plan-smith:plan-smith 아래 요구사항 파일을 읽고, 이 게임을 구현하기 위한 계획서를 작성하라.\n\n- 요구사항: %s\n\n%s\n\n(사용자 확인 게이트가 나오면 배치 실행이므로 스스로 승인하고 진행한다.)\n이 단계에서는 코드를 작성하지 않는다.' \
    "$GAME" "$(notice "$1")"
}

impl_prompt() { # $1 plan path, $2 cell dir  — transfer/runner.js implPrompt 문안 그대로
  printf '아래 계획서를 읽고, 그 계획대로 소스코드를 작성하라.\n\n- 계획서: %s\n- 출력: %s/result/ 아래에 Write (하위 경로를 포함해 Write하면 폴더는 자동 생성된다)\n\n파일 구성·개수·분량은 전부 네가 정한다.\n너에게는 파일을 읽고 쓰는 도구만 있다. 설치·빌드·실행·테스트는 할 수 없다.' \
    "$1" "$2"
}

stash() { # $1 id, $2 stage, $3 cell — 끊긴 단계의 기록과 부분 산출물을 삭제하지 않고 aborted/ 로 옮긴다
  local dest; dest="$EV/aborted/$(date +%Y%m%d-%H%M%S)-$1-$2"
  mkdir -p "$dest"
  for f in "$EV/${1}_$2".json "$EV/${1}_$2".err "$EV/${1}_$2".start "$EV/${1}_$2".end; do [ -e "$f" ] && mv -- "$f" "$dest/"; done
  if [ "$2" = plan ]; then
    [ -e "$3/plan.md" ] && mv -- "$3/plan.md" "$dest/"
    [ -d "$3/plans" ] && mv -- "$3/plans" "$dest/"
  else
    [ -d "$3/result" ] && mv -- "$3/result" "$dest/"
  fi
  echo "$1 $2 -> $dest" >> "$EV/stashed.log"
}

limit_hit() { grep -qiE 'spend limit|usage limit|rate limit' "$1" 2>/dev/null; }

ok_json() { [ -s "$1" ] && python3 -c "import json,sys; d=json.load(open('$1')); sys.exit(0 if not d.get('is_error') else 1)" 2>/dev/null; }

plan_file() { # $1 cell dir, $2 arm
  if [ "$2" = base-plan ]; then [ -f "$1/plan.md" ] && echo "$1/plan.md"; else ls "$1"/plans/*/plan.md 2>/dev/null | head -1; fi
}

chain() { # $1 model dir, $2 model id, $3 arm, $4 rep
  local cell=$R/$1/$3/r$4 id=$1_$3_r$4
  mkdir -p "$cell"
  if ok_json "$EV/${id}_plan.json" && [ -n "$(plan_file "$cell" "$3")" ]; then :; else
    [ -e "$EV/STOP" ] && return
    if [ -e "$EV/${id}_plan.json" ] || [ -e "$cell/plan.md" ] || [ -d "$cell/plans" ]; then stash "$id" plan "$cell"; touch "$EV/${id}_plan.resumed"; fi
    date +%s > "$EV/${id}_plan.start"
    if [ "$3" = base-plan ]; then
      (cd "$cell" && claude -p "$(base_prompt "$cell" "$2")" --model "$2" --settings "$R/inputs/settings_base.json" \
        --tools "Read,Write,Glob,Grep,Agent,Skill" "${COMMON[@]}" > "$EV/${id}_plan.json" 2> "$EV/${id}_plan.err")
    else
      (cd "$cell" && claude -p "$(smith_prompt "$2")" --model "$2" --plugin-dir "$PD" --settings "$R/inputs/settings_ps.json" \
        --tools "Read,Write,Glob,Grep,Agent,Skill" "${COMMON[@]}" > "$EV/${id}_plan.json" 2> "$EV/${id}_plan.err")
    fi
    date +%s > "$EV/${id}_plan.end"
    limit_hit "$EV/${id}_plan.json" && { touch "$EV/STOP"; echo "$id plan: LIMIT" >> "$EV/errors.log"; return; }
  fi
  local plan; plan=$(plan_file "$cell" "$3")
  [ -z "$plan" ] && { echo "$id: NO PLAN FILE" >> "$EV/errors.log"; return; }
  if ok_json "$EV/${id}_impl.json" && [ -n "$(find "$cell/result" -type f 2>/dev/null | head -1)" ]; then :; else
    [ -e "$EV/STOP" ] && return
    if [ -e "$EV/${id}_impl.json" ] || [ -d "$cell/result" ]; then stash "$id" impl "$cell"; touch "$EV/${id}_impl.resumed"; fi
    date +%s > "$EV/${id}_impl.start"
    (cd "$cell" && claude -p "$(impl_prompt "$plan" "$cell")" --model "$2" --settings "$R/inputs/settings_base.json" \
      --tools "Read,Write" "${COMMON[@]}" > "$EV/${id}_impl.json" 2> "$EV/${id}_impl.err")
    date +%s > "$EV/${id}_impl.end"
    limit_hit "$EV/${id}_impl.json" && { touch "$EV/STOP"; echo "$id impl: LIMIT" >> "$EV/errors.log"; return; }
  fi
  echo "$id: done" >> "$EV/progress.log"
}

rm -f -- "$EV/STOP"
for r in 1 2 3; do
  for m in "opus-5.5 claude-opus-5-5" "fable-5.1 claude-fable-5-1"; do
    set -- $m
    for arm in base-plan plan-smith; do chain "$1" "$2" "$arm" "$r" & done
  done
  wait
  echo "BATCH r$r RETURNED $(date)" >> "$EV/progress.log"
  [ -e "$EV/STOP" ] && { echo "STOPPED ON LIMIT after batch r$r $(date)" >> "$EV/progress.log"; break; }
done
echo "ALL CHAINS RETURNED $(date)" >> "$EV/progress.log"
