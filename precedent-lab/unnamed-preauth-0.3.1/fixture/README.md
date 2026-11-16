# workbench

A small workspace UI kit: tab strip state, API token handling, the app shell layout and document head icons.

- `src/tabs/` — tab strip state; keys are React keys and URL state (`?tabs=t1,t3`)
- `src/auth/` — API client token resolution
- `src/layout/` — app shell CSS (the shell is also embedded in split panes)
- `src/head/` — favicon links
- `scripts/check.sh` — advisory pre-commit check

Run the tests with `npm test` (Node's built-in test runner, no dependencies).
