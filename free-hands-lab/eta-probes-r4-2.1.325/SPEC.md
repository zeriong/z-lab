# free-hands ETA — platform probes, round 4 (Q4 only)

Frozen before running, 2026-11-16. Sibling of `../eta-probes-r3-2.1.325/`. Round 3's Q4 ran, but mod-probe's atom was
declared under the plugin name `eta-probe` while the plugin is `mod-probe`; the engine denied the write ("eta-probe
owns that value and only its owner writes it"), the error ended the `tool.call` handler before its log row, and no
`tool.call` row or band change could be recorded. Everything in round 3 holds here unchanged — the trust step included
— except the atom's owner and its type declaration, both `mod-probe`, and the free-hands copy: round 3 copied the
working tree of because-i-needed `plugins/free-hands`, which already held uncommitted 0.5.0 candidate changes; this
round extracts `plugins/free-hands` from commit `34a786b` (0.4.1) with `git archive`, as the parent SPEC intended. V00 records the versions again.

## Cases (n=1)
- **V00** — `claude --version`, `tmux -V`, `python3 --version`, `node --version`.
- **Q4** — as `../eta-probes-2.1.325/SPEC.md` Q4, with round 3's trust step and the atom owner above.

## Metrics, Decision
As the parent SPEC: elapsed ms only; nothing ships from this experiment.
