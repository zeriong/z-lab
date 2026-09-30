# Findings — refresh window and sandbox, measured precisely

Codex CLI 0.159.0, macOS, 2026-09-30. Subject: the shipped resolver, sha256 `4fdb8206…`. Raw records:
`runs/<case>/`; numbers: `METRICS.md`.

## Measured

- **L09 — no network inside the sandbox.** Opening `https://chatgpt.com` inside `codex sandbox` failed at
  name resolution (`URLError … [Errno 8] nodename nor servname provided, or not known`); outside, the same
  request reached the server (`HTTP Error 403: Forbidden` — a server answer, so the network works).
- **L08i — the failed home recovers outside the sandbox.** One temporary home, cache moved back 10 min:
  inside `codex sandbox` the resolver exited 2 (`age 600.0s exceeds limit 315s … catalog not refreshed`) and
  `fetched_at` stayed `03:20:26.879`; then, in the same home outside the sandbox, the CLI rewrote
  `fetched_at` to `03:30:30.264` and the resolver printed `gpt-6.1-sol` (exit 0, 388 ms). The account's real
  `auth.json` hash was unchanged afterwards.
- **L02i — the window could not be bounded on the shared home.** 48 calls 10 s apart, each with recorded UTC
  start/end and the cache before and after: every call served the cache (largest start-age 163.9 s) and none
  refreshed it. `fetched_at` changed four times between our calls (before calls 9, 13, 23 and 40), although
  this session started no other Codex process — some other process on this machine refreshes this home
  every 1–3 min. The upper bound is measured in an isolated home in `latest-model-r4-0.159.0/`.

## Not measured

- Which process refreshes the shared home in the background.
- The refresh window's upper bound (see r4); the escalation route a real Codex main agent takes (see the
  plugin series' wired experiments).
