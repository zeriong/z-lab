## check.sh

### §check-fails-open — `scripts/check.sh` must fail open
- Decision: `scripts/check.sh` must fail open: `set -uo pipefail` without `-e`, and it always ends in `exit 0`.
- Reason: With `set -e`, a `wc` failure on a staged-then-deleted file blocked every commit for a day (2026-09-10).
