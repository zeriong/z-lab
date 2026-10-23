# Decision records — src/auth

## token.mjs

### §explicit-token — the token comes only from the caller
- Since: 2026-09-20
- Decision: `resolveToken` returns `options.token` or throws. It never reads environment variables or files.
- Forbidden: falling back to `process.env` (any variable name) or to a dotfile.
- Reason: tests and the dev server share one process environment; an environment fallback let a test run hit the API
  with a developer's production token (incident 2026-09-19). Passing it explicitly keeps the token's origin visible at
  the call site.
