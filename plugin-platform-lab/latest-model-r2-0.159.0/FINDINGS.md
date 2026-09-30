# Findings — the shipped resolver, and inside a Codex sandbox

Codex CLI 0.159.0, Claude Code 2.1.284, macOS, 2026-09-30. Subject: the resolver as
shipped, sha256 `4fdb8206…` (`subject/SHA256`). Raw records: `runs/<case>/`; numbers:
`METRICS.md`.

## Measured

- **L04r** — the 15 L04 inputs gave the same stdout and exit codes as L04; the stderr
  notes now read `using <result> (newest <family>) instead of <input>`. `codex nova`, a
  family the catalog does not list, exited 2 with `no listed Codex model found for family
  nova` — families are no longer a fixed list, and an unknown one still stops.
- **L06r** — `ANTHROPIC_DEFAULT_SONNET_MODEL` in the environment and in a project
  `.claude/settings.json` each gave exit 2 naming the source; the same settings file made
  invalid JSON gave exit 2 naming the file, the parser message, line and column.
- **L07r** — no `codex` on `PATH` and an empty `CODEX_HOME` each gave exit 2, stdout empty.
- **L08 — a sandboxed shell cannot refresh the catalog.** With a temporary `CODEX_HOME`
  holding copies of the account's credentials, config and cache:
  (a) fresh cache inside `codex sandbox` → exit 0, `gpt-6.1-sol`, cache untouched;
  (b) cache 10 min old inside `codex sandbox` → exit 2 (`age … exceeds limit 315s …
  catalog not refreshed`), `fetched_at` unchanged;
  (c) a stale home outside the sandbox → the CLI refreshed (`fetched_at` rewritten to the
  call time) and the resolver returned `gpt-6.1-sol`.
  **Deviation from SPEC:** the frozen SPEC says (c) reruns "the same stale home"; `run.py`
  built a separate home for (c) from fresh copies (its `fetched_at` differs from (b)'s by
  3 s). So this shows a stale home failing inside and another stale home succeeding
  outside, not the failed home recovering. The same-home rerun is measured in
  `latest-model-r3-0.159.0/` (L08i). Why the sandboxed call could not refresh is not in
  these records (the inner `codex debug models` stderr was not kept); the sandbox network
  is recorded in r3 (L09).

## Not measured

- The cause of the failed refresh inside the sandbox (network, writes, or both) — see r3.
- How a Codex main agent actually escalates one command out of its sandbox under each
  approval policy, and whether `codex exec` (non-interactive) can — measured on the real
  skills in the plugin series' wired experiments.
- Everything listed as not measured in `latest-model-0.159.0/FINDINGS.md` that this
  experiment did not repeat (Linux/WSL, other Claude override channels, access-restricted
  and retiring models, model quality).
