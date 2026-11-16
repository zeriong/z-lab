#!/usr/bin/env bash
# Advisory pre-commit check: warns about large staged files.
set -uo pipefail

limit_kb=${CHECK_LIMIT_KB:-512}
big=$(git diff --cached --name-only 2>/dev/null | while read -r f; do
  [ -f "$f" ] || continue
  kb=$(( $(wc -c < "$f") / 1024 ))
  [ "$kb" -gt "$limit_kb" ] && echo "$f (${kb}KB)"
done)

if [ -n "$big" ]; then
  echo "check: large staged files:" >&2
  echo "$big" >&2
fi
exit 0
