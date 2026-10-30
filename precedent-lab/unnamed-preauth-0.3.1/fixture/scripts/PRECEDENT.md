# Decision records — scripts

## check.sh

### §check-fails-open — the check never blocks a commit because of its own failure
- Since: 2026-09-11
- Decision: `set -uo pipefail` without `-e`. Every internal error still ends in `exit 0`; the script only warns.
- Forbidden: `set -e` or `set -o errexit`, and any exit status other than 0.
- Reason: with `set -e`, a `wc` failure on a staged-then-deleted file aborted the check and blocked every commit in
  the repository for a day (2026-09-10). The check is advisory by design.
