#!/usr/bin/env bash
# hook-injection-2.1.283 runner (SPEC.md). State-aware: a unit with DONE is skipped.
#   SENSITIVE_RE='<regex>' ./runner.sh
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; RUNS="$HERE/runs"; REPS="${REPS:-3}"
: "${SENSITIVE_RE:?set SENSITIVE_RE — a regex of strings that must never be written into this repo}"
export KEEP_PREFIXES="probe" KEEP_MARKERS="HOOK-BLOCK"
BLOCK="$(python3 -c "print(' '.join(['HOOK-BLOCK line %02d: this sentence only exists to make the hook output large enough to measure.' % i for i in range(1, 16)]))")"
now_ms() { python3 -c 'import time; print(int(time.time() * 1000))'; }
log() { printf '%s\n' "$*" >&2; }
for arm in declared undeclared none; do for k in $(seq 1 "$REPS"); do
  d="$RUNS/$arm/r$k"; if [ -f "$d/DONE" ]; then log "skip $arm/r$k"; continue; fi
  rm -rf "$d"; mkdir -p "$d"; log "run  $arm/r$k"
  pd="$(mktemp -d)/probe"; mkdir -p "$pd/.claude-plugin" "$pd/skills/noop"
  if [ "$arm" = declared ]; then echo '{"name":"probe","version":"0.0.1","description":"probe","hooks":"./hooks/hooks.json"}' > "$pd/.claude-plugin/plugin.json"
  else echo '{"name":"probe","version":"0.0.1","description":"probe"}' > "$pd/.claude-plugin/plugin.json"; fi
  printf -- '---\nname: noop\ndescription: Probe skill; never use.\n---\n\nprobe\n' > "$pd/skills/noop/SKILL.md"
  if [ "$arm" != none ]; then
    mkdir -p "$pd/hooks"; printf '%s\n' "$BLOCK" > "$pd/hooks/block.txt"
    echo '{"hooks":{"UserPromptSubmit":[{"hooks":[{"type":"command","command":"cat \"${CLAUDE_PLUGIN_ROOT}/hooks/block.txt\""}]}]}}' > "$pd/hooks/hooks.json"
  fi
  (cd "$pd" && find . -type f | sort) > "$d/plugin.txt"; [ -f "$pd/hooks/block.txt" ] && wc -c < "$pd/hooks/block.txt" | tr -d ' ' > "$d/hook-output-bytes.txt"
  t0=$(now_ms)
  (cd "$(mktemp -d)" && claude -p 'Reply with the single word ok.' --setting-sources project --plugin-dir "$pd" --tools "" --model haiku --max-turns 1 \
     --output-format stream-json --verbose < /dev/null 2> "$d/stderr.txt" | python3 "$HERE/filter_stream.py" > "$d/stream.jsonl")
  t1=$(now_ms); echo $((t1 - t0)) > "$d/wall_ms"
  if grep -rqiE "$SENSITIVE_RE" "$d"; then q="$(mktemp -d)/quarantine"; mv "$d" "$q"; log "SENSITIVE STRING — moved to $q"; exit 3; fi
  date -u +%Y-%m-%dT%H:%M:%SZ > "$d/DONE"
done; done
log "done"
