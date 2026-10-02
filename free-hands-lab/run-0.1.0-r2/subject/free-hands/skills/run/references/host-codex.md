# Codex adapter

Read with `SKILL.md`; every command lives there. This file says how its steps map onto Codex.

## Entry and asking

- `$free-hands:run <goal>` enters at once. The word "free-hands" in a prompt makes the `UserPromptSubmit` hook add an
  entry note: ask the entry question as a plain question and end the turn; on "yes", read this skill's `SKILL.md`
  (the note gives its absolute path) and follow it.
- Codex's default mode has no ask tool, so "asking" means ending the turn with a question — the `Stop` hook is what
  keeps a run going. When `request_user_input` is available (plan mode, or the feature turned on), the `PreToolUse`
  hook denies it while the goal is open.
- The hooks run only after the user trusts them in `/hooks`. Without that, the rules in `SKILL.md` still hold but
  nothing enforces them; say so in one line (a notice, not a question) and continue.

## Session goal

Codex has a goals feature. If this session exposes a tool that sets a goal, set it with the goal's completion
condition; otherwise tell the user in one line how to pin it, and continue. The goal file stays the source of truth.

## The panel

- Each role's instructions are the body of `<plugin>/agents/<role>.md` below its Claude frontmatter. Codex ignores the
  frontmatter's `tools` and `model`, so neither read-only access nor the model comes from the file.
- Use native subagents only if this session can hold each one read-only (no file writes, no state-changing commands)
  and run it on the model `panel.py models --host codex` resolved for that role. Give each the role body, the brief and
  the round, set `FREE_HANDS_ROLE=<role>` where the host lets you set its environment, and save its JSON reply as
  `<round>/<role>.json`.
- Otherwise use `panel.py run` (the command in `SKILL.md`): one `codex exec -s read-only` child per role, web search
  on for `evidence-hunter` and `trend-tracker`, `FREE_HANDS_ROLE` and `CXC_MODE=off` set so neither free-hands nor
  claude-x-codex acts inside it. A sandboxed Codex main cannot start a separate `codex exec` (ux-ui measured this), so
  run that command outside the sandbox through the host's escalation route.
- The model that ran is `ran` in `<round>/<role>.meta.json`, read from the child's run header — not from the reply.
- `panel.py models` exits a role with `error` when the newest model cannot be determined (`exit` 2) or the effort is
  not supported (3). That role is missing for the round. When the message says `catalog not refreshed` and your
  shell is sandboxed without network, rerun that one resolver command outside the sandbox first.
