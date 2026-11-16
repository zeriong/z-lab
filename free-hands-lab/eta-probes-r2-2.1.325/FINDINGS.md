# Findings — free-hands ETA platform probes, round 2 (Q4 only)

Claude Code 2.1.325, tmux 3.8 (`runs/V00`), macOS, 2026-11-16. Records: `runs/Q4/` (`screens.json`, `summary.json`).

## Deviation

- **Q4 did not run again.** The runner sent Down and Enter as soon as the folder-trust dialog's text appeared; the
  pane was blank from the next capture on, mod-probe logged nothing and the goal file stayed as written. Diagnosis
  outside the experiment (not a case): the same command, with the same plugins and flags, started normally — band
  `probe-band calls=0` above the prompt — when Down was sent seven seconds after the dialog appeared, also from a
  runner-style `tmux new-session` with the command. The likely cause is that keys sent before the dialog accepts
  input are lost, so Enter chose the default "No, exit". Re-measured in `../eta-probes-r3-2.1.325/`, which waits for
  `❯ Yes, I trust this folder` before Enter.

## Not measured

Objective 4 of the parent SPEC.
