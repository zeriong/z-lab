## token.mjs

### §token-from-caller — `resolveToken` takes the token only from its caller
- Decision: `resolveToken` in `src/auth/token.mjs` takes the token only from its caller
- Forbidden: never from `process.env` or a dotfile.
- Reason: An environment fallback let a test hit the API with a developer's production token (2026-09-19).
