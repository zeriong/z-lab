#!/usr/bin/env bash
# split-1.6.0 runner (SPEC.md). State-aware.   SENSITIVE_RE='<regex>' ./runner.sh [p20k p32k p37k]
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; RUNS="$HERE/runs"; PLUGIN="$HERE/subject/plugins/plan-smith"
CHECK="$PLUGIN/scripts/split-check.py"; REPS="${REPS:-2}"
: "${SENSITIVE_RE:?set SENSITIVE_RE}"
export KEEP_PREFIXES="plan-smith" KEEP_MARKERS="plan-smith ·"
PROTOCOL="$(awk '/^## Split protocol \(copy verbatim to the writer\)/{f=1} f' "$PLUGIN/skills/forge/references/split.md")"
now_ms() { python3 -c 'import time; print(int(time.time() * 1000))'; }
for id in ${*:-p20k p32k p37k}; do for k in $(seq 1 "$REPS"); do
  d="$RUNS/$id/r$k"; if [ -f "$d/DONE" ]; then echo "skip $id/r$k" >&2; continue; fi
  rm -rf "$d"; mkdir -p "$d"; echo "run  $id/r$k" >&2
  root="$(mktemp -d)"; pd="$root/plans/$id"; mkdir -p "$pd"; cp "$HERE/inputs/$id.md" "$pd/plan.md"
  mv "$pd/plan.md" "$pd/plan.unsplit.md"                                   # procedure step 1
  base="Split this plan per the protocol below.
- Unsplit plan (read-only input): $pd/plan.unsplit.md
- Index output path: $pd/plan.md
- Parts directory: $pd/parts/

$PROTOCOL"
  for a in 1 2; do
    prompt="$base"
    [ "$a" = 2 ] && prompt="$base

The previous attempt failed the checker. Fix exactly these problems (the unsplit plan is unchanged; rewrite the index and parts):
$(cat "$d/attempt1.check.txt")"
    printf '%s\n' "$prompt" | sed "s#$root#<FIXTURE>#g" > "$d/attempt$a.prompt.txt"
    t0=$(now_ms)
    (cd "$root" && claude -p "$prompt" --agent plan-smith:plan-writer --plugin-dir "$PLUGIN" --setting-sources project \
       --permission-mode acceptEdits --model opus --output-format stream-json --verbose < /dev/null 2> "$d/attempt$a.stderr.txt" \
       | python3 "$HERE/filter_stream.py" > "$d/attempt$a.stream.jsonl")
    t1=$(now_ms); echo $((t1 - t0)) > "$d/attempt$a.wall_ms"
    python3 "$CHECK" "$pd" > "$d/attempt$a.check.txt" 2>&1; rc=$?; echo "$rc" > "$d/attempt$a.check.exit"
    [ "$rc" = 0 ] && break
  done
  mkdir -p "$d/output"; cp -R "$pd/." "$d/output/"
  if grep -rqiE "$SENSITIVE_RE" "$d"; then q="$(mktemp -d)/quarantine"; mv "$d" "$q"; echo "SENSITIVE — moved to $q" >&2; exit 3; fi
  date -u +%Y-%m-%dT%H:%M:%SZ > "$d/DONE"
done; done
echo done >&2
