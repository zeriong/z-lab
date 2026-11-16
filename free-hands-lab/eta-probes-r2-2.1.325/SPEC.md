# free-hands ETA — platform probes, round 2 (Q4 only)

Frozen before running, 2026-11-16. Sibling of `../eta-probes-2.1.325/`, whose Q4 never reached a prompt: its runner
pressed Enter on the folder-trust dialog, whose default is "No, exit" (the same dialog as `plugin-platform-lab/
mod-interactive-2.1.299` deviation D1), and the session exited. Everything in that SPEC's Q4 holds here unchanged —
objective 4, the isolation, the goal file, `mod-probe`, the free-hands copy, the prompt, the 2 s screen captures —
except one step: on the trust dialog the runner sends Down, then Enter ("Yes, I trust this folder"). V00 records the
versions again.

## Cases (n=1)
- **V00** — `claude --version`, `tmux -V`, `python3 --version`, `node --version`.
- **Q4** — as `../eta-probes-2.1.325/SPEC.md` Q4, with the trust step above.

## Metrics, Decision
As the parent SPEC: elapsed ms only; nothing ships from this experiment. Q4's findings fix how the dashboard band can
follow a free-hands run.
