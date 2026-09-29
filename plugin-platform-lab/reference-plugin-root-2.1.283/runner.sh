#!/usr/bin/env bash
# reference-plugin-root-2.1.283 runner (SPEC.md). State-aware.   SENSITIVE_RE='<regex>' ./runner.sh
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; RUNS="$HERE/runs"
: "${SENSITIVE_RE:?set SENSITIVE_RE}"
export KEEP_PREFIXES="probe" KEEP_MARKERS="HELLO-MARK"
pd="$(mktemp -d)/probe"; mkdir -p "$pd/.claude-plugin" "$pd/scripts" "$pd/skills/hello/references"
echo '{"name":"probe","version":"0.0.1","description":"probe"}' > "$pd/.claude-plugin/plugin.json"
printf '#!/usr/bin/env bash\necho "HELLO-MARK $0"\n' > "$pd/scripts/hello.sh"; chmod +x "$pd/scripts/hello.sh"
cat > "$pd/skills/hello/SKILL.md" <<'SKILL'
---
name: hello
description: Probe skill that follows its reference file. Use only when invoked as /probe:hello.
---

Read `references/steps.md` in this skill's directory with the Read tool, then run the command it gives with the Bash tool, exactly as written, and report the output verbatim.
SKILL
cat > "$pd/skills/hello/references/steps.md" <<'REF'
# Steps

Run this command with the Bash tool, exactly as written:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/hello.sh"
```
REF
for k in 1 2 3; do d="$RUNS/r$k"; if [ -f "$d/DONE" ]; then echo "skip r$k" >&2; continue; fi
  rm -rf "$d"; mkdir -p "$d"; echo "run  r$k" >&2
  (cd "$pd" && find . -type f | sort && cat skills/hello/SKILL.md skills/hello/references/steps.md) > "$d/plugin.txt"
  (cd "$(mktemp -d)" && claude -p "/probe:hello" --plugin-dir "$pd" --setting-sources project --allowedTools Bash Read --model haiku --max-turns 6 \
     --output-format stream-json --verbose < /dev/null 2> "$d/stderr.txt" | python3 "$HERE/filter_stream.py" > "$d/stream.jsonl")
  if grep -rqiE "$SENSITIVE_RE" "$d"; then q="$(mktemp -d)/quarantine"; mv "$d" "$q"; echo "SENSITIVE — moved to $q" >&2; exit 3; fi
  date -u +%Y-%m-%dT%H:%M:%SZ > "$d/DONE"
done
echo done >&2
