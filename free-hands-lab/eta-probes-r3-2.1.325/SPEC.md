# free-hands ETA — platform probes, round 3 (Q4 only)

Frozen before running, 2026-11-16. Sibling of `../eta-probes-2.1.325/` and `../eta-probes-r2-2.1.325/`, whose Q4 never
reached a prompt: round 1 pressed Enter on the folder-trust dialog's default ("No, exit"); round 2 sent Down and Enter
as soon as the dialog's text appeared, and the session exited the same way (blank pane after the keys). Run by hand
outside the experiment, the same command started normally when Down was sent seven seconds after the dialog appeared
(a diagnosis, not a case). Everything in the parent SPEC's Q4 holds here unchanged except the trust step: wait 2 s,
send Down, wait up to 5 s for the screen to show `❯ Yes, I trust this folder` (up to three attempts), then Enter; if
Yes is never selected the case stops without sending Enter. V00 records the versions again.

## Cases (n=1)
- **V00** — `claude --version`, `tmux -V`, `python3 --version`, `node --version`.
- **Q4** — as `../eta-probes-2.1.325/SPEC.md` Q4, with the trust step above.

## Metrics, Decision
As the parent SPEC: elapsed ms only; nothing ships from this experiment. Q4's findings fix how the dashboard band can
follow a free-hands run.
