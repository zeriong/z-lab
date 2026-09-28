#!/usr/bin/env bash
# effort-flags-0.1.0 runner (SPEC.md). State-aware.   SENSITIVE_RE='<regex>' ./runner.sh
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; RUNS="$HERE/runs"
: "${SENSITIVE_RE:?set SENSITIVE_RE}"
export CXC_MODE=off KEEP_PREFIXES="claude-x-codex" KEEP_MARKERS="[claude-x-codex"
fin() { if grep -rqiE "$SENSITIVE_RE" "$1"; then q="$(mktemp -d)/quarantine"; mv "$1" "$q"; echo "SENSITIVE — moved to $q" >&2; exit 3; fi; date -u +%Y-%m-%dT%H:%M:%SZ > "$1/DONE"; }
go() { if [ -f "$1/DONE" ]; then echo "skip ${1#"$RUNS"/}" >&2; return 1; fi; rm -rf "$1"; mkdir -p "$1"; echo "run  ${1#"$RUNS"/}" >&2; }
d="$RUNS/E01"; if go "$d"; then
  codex debug models 2>/dev/null | python3 -c 'import json,sys
d=json.load(sys.stdin)
for m in d["models"]:
    if m["slug"].startswith("gpt-6-"):
        print(json.dumps({"slug": m["slug"], "default": m.get("default_reasoning_level"), "levels": [(l["effort"], l.get("description")) for l in m.get("supported_reasoning_levels", [])]}))' > "$d/levels.jsonl"
  codex --version > "$d/codex-version.txt" 2>&1; fin "$d"; fi
for v in xhigh high bogus; do d="$RUNS/E02/$v"; go "$d" || continue
  h="$(mktemp -d)"; : > "$h/config.toml"
  (cd "$h" && CODEX_HOME="$h" perl -e 'alarm shift; exec @ARGV' 25 codex exec --strict-config --skip-git-repo-check --ephemeral -m gpt-6-sol \
     -c "model_reasoning_effort=\"$v\"" 'Reply ok.' < /dev/null > "$d/out.txt" 2>&1; echo "$?" > "$d/exit")
  printf 'CODEX_HOME=<empty temp, no auth> codex exec --strict-config --skip-git-repo-check --ephemeral -m gpt-6-sol -c model_reasoning_effort="%s" "Reply ok."\n' "$v" > "$d/cmd.txt"; fin "$d"; done
for combo in opus:xhigh sonnet:high haiku:bogus; do m="${combo%%:*}"; e="${combo##*:}"; d="$RUNS/E03/$m-$e"; go "$d" || continue
  t="$(mktemp -d)"
  (cd "$t" && claude -p 'Reply with the single word ok.' --model "$m" --effort "$e" --setting-sources project --tools "" --max-turns 1 \
     --output-format stream-json --verbose < /dev/null 2> "$d/stderr.txt" | python3 "$HERE/filter_stream.py" > "$d/stream.jsonl"; echo "${PIPESTATUS[0]}" > "$d/exit")
  printf 'claude -p <prompt> --model %s --effort %s --setting-sources project --tools "" --max-turns 1 --output-format stream-json --verbose\n' "$m" "$e" > "$d/cmd.txt"; fin "$d"; done
echo done >&2
