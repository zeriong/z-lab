#!/usr/bin/env bash
# claude-code-2.1.283 runner (SPEC.md). State-aware (z-lab Rule 6): a unit with DONE is skipped.
#
#   SENSITIVE_RE='<regex>' ./runner.sh          # every probe
#   SENSITIVE_RE='<regex>' ./runner.sh P04      # only these
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
RUNS="$HERE/runs"; REPS="${REPS:-3}"; CM="${CLAUDE_MODEL:-haiku}"
: "${SENSITIVE_RE:?set SENSITIVE_RE — a regex of strings that must never be written into this repo}"
export KEEP_PREFIXES="probe" KEEP_MARKERS="HOOK-MARK"
ISO_CLAUDE=(--setting-sources project)

now_ms() { python3 -c 'import time; print(int(time.time() * 1000))'; }
log() { printf '%s\n' "$*" >&2; }
unit() {
  if [ -f "$1/DONE" ]; then log "skip ${1#"$RUNS"/}"; return 1; fi
  rm -rf "$1"; mkdir -p "$1"; log "run  ${1#"$RUNS"/}"; return 0
}
finish() {
  if grep -rqiE "$SENSITIVE_RE" "$1" 2>/dev/null; then
    local q; q="$(mktemp -d)/quarantine"; mv "$1" "$q"
    log "SENSITIVE STRING in output — unit moved to $q; stopping"; exit 3
  fi
  date -u +%Y-%m-%dT%H:%M:%SZ > "$1/DONE"
}
claude_p() {   # claude_p <dir> <prompt> [args…]
  local d="$1" p="$2"; shift 2
  printf '%s\n' "$p" > "$d/prompt.txt"; printf '%q ' claude -p '<prompt.txt>' "$@" > "$d/cmd.txt"
  local t0 t1 rc; t0=$(now_ms)
  claude -p "$p" "$@" --output-format stream-json --verbose < /dev/null 2> "$d/stderr.txt" \
    | python3 "$HERE/filter_stream.py" > "$d/stream.jsonl"
  rc=${PIPESTATUS[0]}; t1=$(now_ms)
  echo "$rc" > "$d/exit"; echo $((t1 - t0)) > "$d/wall_ms"
}
step() {       # step <transcript> <command…> — record the command, its output and exit code
  local tr="$1"; shift
  { printf '$ %s\n' "$*"; "$@" < /dev/null 2>&1; printf 'exit=%s\n\n' "$?"; } >> "$tr"
}
manifest() { mkdir -p "$1/.claude-plugin"; printf '%s\n' "$2" > "$1/.claude-plugin/plugin.json"; }
skill() { mkdir -p "$1/skills/$2"; printf -- '---\nname: %s\ndescription: %s\n%s---\n\n%s\n' "$3" "$4" "${6:-}" "$5" > "$1/skills/$2/SKILL.md"; }
reps() { seq 1 "$REPS"; }

p_P01() { local d pd; d="$RUNS/P01/-/r1"; unit "$d" || return 0
  pd="$(mktemp -d)/probe"; manifest "$pd" '{"name":"probe","version":"0.0.1","description":"probe"}'
  skill "$pd" dirname fmname 'Probe skill for invocation-name source; never use.' 'probe'
  (cd "$(mktemp -d)" && claude_p "$d" 'Reply with the single word ok.' "${ISO_CLAUDE[@]}" --plugin-dir "$pd" --tools "" --model "$CM" --max-turns 1)
  (cd "$pd" && find . -type f | sort && cat skills/dirname/SKILL.md) > "$d/plugin.txt"; finish "$d"; }

p_P02() { local d cfg m tr; d="$RUNS/P02/-/r1"; unit "$d" || return 0
  cfg="$(mktemp -d)/cfg"; m="$(mktemp -d)/mkt"; tr="$d/transcript.txt"; mkdir -p "$cfg"
  manifest "$m/plugins/probe" '{"name":"probe","version":"1.0.0","description":"probe"}'
  skill "$m/plugins/probe" dirname dirname 'probe' 'probe'
  printf '%s\n' '{"name":"old-mkt","owner":{"name":"x"},"plugins":[{"name":"probe","source":"./plugins/probe","version":"1.0.0"}]}' > "$m/marketplace.json"
  mkdir -p "$m/.claude-plugin" && mv "$m/marketplace.json" "$m/.claude-plugin/marketplace.json"
  git -C "$m" init -q && git -C "$m" add -A && git -C "$m" -c user.name=x -c user.email=x@x commit -qm v1
  export CLAUDE_CONFIG_DIR="$cfg"
  echo "# phase 1 — install from old-mkt" >> "$tr"
  step "$tr" claude plugin marketplace add "$m"
  step "$tr" claude plugin install probe@old-mkt
  echo "# phase 2 — rename marketplace old-mkt→new-mkt and plugin probe→probe2 (folder too), bump 2.0.0, then update" >> "$tr"
  git -C "$m" mv plugins/probe plugins/probe2
  printf '%s\n' '{"name":"probe2","version":"2.0.0","description":"probe"}' > "$m/plugins/probe2/.claude-plugin/plugin.json"
  printf '%s\n' '{"name":"new-mkt","owner":{"name":"x"},"plugins":[{"name":"probe2","source":"./plugins/probe2","version":"2.0.0"}]}' > "$m/.claude-plugin/marketplace.json"
  git -C "$m" add -A && git -C "$m" -c user.name=x -c user.email=x@x commit -qm v2
  step "$tr" claude plugin marketplace update old-mkt
  step "$tr" claude plugin marketplace list
  step "$tr" claude plugin list
  step "$tr" claude plugin update probe@old-mkt
  step "$tr" claude plugin install probe2@new-mkt
  step "$tr" claude plugin install probe2@old-mkt
  step "$tr" claude plugin list
  echo "# phase 3 — remove the old registration, add again, install under the new name" >> "$tr"
  step "$tr" claude plugin marketplace remove old-mkt
  step "$tr" claude plugin list
  step "$tr" claude plugin marketplace add "$m"
  step "$tr" claude plugin install probe2@new-mkt
  step "$tr" claude plugin list
  python3 -c "import json,sys; print(sorted(json.load(open(sys.argv[1])).keys()))" "$cfg/plugins/known_marketplaces.json" > "$d/registered-names.txt" 2>&1
  unset CLAUDE_CONFIG_DIR
  finish "$d"; }

p_P03() { local d cfg m tr; d="$RUNS/P03/-/r1"; unit "$d" || return 0
  cfg="$(mktemp -d)/cfg"; m="$(mktemp -d)/mkt"; tr="$d/transcript.txt"; mkdir -p "$cfg"
  manifest "$m/plugins/probe" '{"name":"probe","version":"1.0.0","description":"probe"}'
  skill "$m/plugins/probe" dirname dirname 'probe' 'probe'
  mkdir -p "$m/.claude-plugin"
  printf '%s\n' '{"name":"bin-probe","owner":{"name":"x"},"plugins":[{"name":"probe","source":"./plugins/probe","version":"1.0.0"}]}' > "$m/.claude-plugin/marketplace.json"
  export CLAUDE_CONFIG_DIR="$cfg"
  step "$tr" claude plugin marketplace add "$m"
  step "$tr" claude plugin marketplace add "$m"
  step "$tr" claude plugin install probe@bin-probe --scope user
  step "$tr" claude plugin install probe@bin-probe
  step "$tr" claude plugin install nope@bin-probe
  unset CLAUDE_CONFIG_DIR
  finish "$d"; }

p_P04() { local arm d pd
  for arm in declared undeclared none; do d="$RUNS/P04/$arm/r1"; unit "$d" || continue
    pd="$(mktemp -d)/probe"
    if [ "$arm" = declared ]; then manifest "$pd" '{"name":"probe","version":"0.0.1","description":"probe","hooks":"./hooks/hooks.json"}'
    else manifest "$pd" '{"name":"probe","version":"0.0.1","description":"probe"}'; fi
    if [ "$arm" != none ]; then
      mkdir -p "$pd/hooks"
      printf '%s\n' "{\"hooks\":{\"UserPromptSubmit\":[{\"hooks\":[{\"type\":\"command\",\"command\":\"echo HOOK-MARK-$arm\"}]}]}}" > "$pd/hooks/hooks.json"
    fi
    skill "$pd" noop noop 'Probe skill; never use.' 'probe'
    claude plugin validate "$pd" < /dev/null > "$d/validate.txt" 2>&1; echo "exit=$?" >> "$d/validate.txt"
    (cd "$(mktemp -d)" && claude_p "$d" 'Reply with the single word ok.' "${ISO_CLAUDE[@]}" --plugin-dir "$pd" --tools "" --model "$CM" --max-turns 1)
    (cd "$pd" && find . -type f | sort) > "$d/plugin.txt"; finish "$d"; done; }

p_P05() { local arm k d pd
  pd="$(mktemp -d)/probe"; manifest "$pd" '{"name":"probe","version":"0.0.1","description":"probe"}'
  skill "$pd" open open 'Probe skill that the model may invoke. Use when asked to invoke probe:open.' 'Reply with the word OPENED.'
  skill "$pd" locked locked 'Probe skill for user invocation only. Use when asked to invoke probe:locked.' 'Reply with the word UNLOCKED.' 'disable-model-invocation: true
'
  for arm in open locked; do for k in $(reps); do d="$RUNS/P05/$arm/r$k"; unit "$d" || continue
    (cd "$(mktemp -d)" && claude_p "$d" "Use the Skill tool to invoke the skill \"probe:$arm\" now. After the attempt, reply with exactly INVOKED if it succeeded or UNAVAILABLE if it did not." \
      "${ISO_CLAUDE[@]}" --plugin-dir "$pd" --tools Skill --model "$CM" --max-turns 3)
    cat "$pd/skills/$arm/SKILL.md" > "$d/skill.md"; finish "$d"; done; done; }

ALL="P01 P02 P03 P04 P05"
for id in ${*:-$ALL}; do "p_$id"; done
log "done"
