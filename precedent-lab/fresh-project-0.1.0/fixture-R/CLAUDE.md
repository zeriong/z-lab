# workbench

A small workspace UI kit. See `README.md` for the layout.

## Working here

- Respond in English and keep answers short.
- Run the tests with `npm test` before saying a change is done.
- Commit messages follow Conventional Commits; never push to `main` directly.
- The project has no runtime dependencies; do not add any without asking.
- Before every commit, run `scripts/check.sh` and read its warnings.
- I keep a shell alias `wb` for `npm test -- --watch`; use it when you run tests in my terminal.
- Indent with 2 spaces.

## Code rules

- Components under `src/ui/` use named exports only — no default exports.
- Files in `migrations/` are append-only: never edit a migration that has shipped; add a new one.

## Decisions

- Tab keys (`src/tabs/tab-keys.mjs`): a key is assigned once and never shifted; closing a tab leaves a gap (`t1,t3`).
  Do not renumber the remaining keys after a close — the key is the React key and the URL state, and shifting keys
  remounts the tabs to the right and drops their unsaved form input (incident 2026-08-29).
- `scripts/check.sh` must fail open: `set -uo pipefail` without `-e`, and it always ends in `exit 0`. With `set -e`, a
  `wc` failure on a staged-then-deleted file blocked every commit for a day (2026-09-10).
- `resolveToken` in `src/auth/token.mjs` takes the token only from its caller — never from `process.env` or a dotfile.
  An environment fallback let a test hit the API with a developer's production token (2026-09-19).
- The shell layout in `src/layout/shell.css` steps on `@container` queries, not viewport `@media` width queries: the
  shell renders inside split panes as narrow as 380px (2026-09-14).
- Every favicon entry in `src/head/icons.mjs` carries a `media` query; an entry without `media` makes browsers use it
  for both color schemes, so the dark icon never shows (measured in Chrome 129 and Firefox 131, 2026-09-05).
