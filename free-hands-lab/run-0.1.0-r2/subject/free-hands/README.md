<p align="center"><strong>free-hands</strong></p>

<p align="center"><strong>Give an agent a finite goal; it works through the checklist without asking or stopping.</strong></p>

<p align="center"><a href=".claude-plugin/plugin.json"><img src="https://img.shields.io/badge/version-0.1.0-blue" alt="Version"></a> <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT"></a> <a href="https://docs.claude.com/en/docs/claude-code/plugins"><img src="https://img.shields.io/badge/Claude%20Code-Plugin-orange" alt="Claude Code Plugin"></a></p>

<p align="center"><a href="#start">Start</a> &bull; <a href="#goal-file">Goal file</a> &bull; <a href="#never-ask">Never ask</a> &bull; <a href="#hooks">Hooks</a> &bull; <a href="#the-panel">The panel</a> &bull; <a href="#stacked-prs">Stacked PRs</a> &bull; <a href="#limits-and-status">Limits and status</a> &bull; <a href="#codex">Codex</a> &bull; <a href="#requirements">Requirements</a> &bull; <a href="#installation">Installation</a></p>

<p align="center"><a href="README.md">English</a> &bull; <a href="README.ko.md">한국어</a> &bull; <a href="README.ja.md">日本語</a> &bull; <a href="README.zh-CN.md">简体中文</a> &bull; <a href="README.zh-TW.md">繁體中文</a></p>

<p align="center"><sub>Part of <a href="../../README.md">because-i-needed</a></sub></p>

---

free-hands fixes your goal as a finite, checkable list, then works through every open item without asking you or stopping. When it reaches a decision you would otherwise make, five read-only panel roles advise; the main agent decides from evidence and records the decision, dissent, and how to revert it.

## Start

- Claude Code: `/free-hands:run <goal>`
- Codex: `$free-hands:run <goal>`
- Or include the word **free-hands** in a prompt. The first response is one entry question in your language. Answer yes to start the skill with that goal; answer no to get possible directions and end that turn. A mention that explains or quotes the name is not a request. While a goal is active, saying “free-hands” again is a correction signal and does not ask for confirmation.

## Goal file

At the repository root, free-hands keeps `.free-hands/goal.md` and adds `.free-hands/` to Git's local exclude file. The file records one goal, its finite checklist, decisions, and resume notes:

```markdown
status: active
max_iterations: 40
iterations: 0
## Goal
<one sentence>
## Checklist
- [ ] <a finite item with a check you can run or observe>
## Decisions
## Resume
<what the next session needs to know>
```

Marks are `- [ ]` open, `- [x]` done, and `- [-] … — needs the user` for work that cannot proceed under a hard limit or another blocker. Status is `active`, `done`, `waiting`, or `paused`. Only open `[ ]` items keep the ask and stop guards engaged. When every item is done, the agent records `done`; when only items needing the user remain, it records `waiting`. At `max_iterations` (40), the restore note tells the agent to set `paused`, report the open items, and stop; asking is allowed again.

## Never ask

The skill does not ask the user during an active goal. This overrides project and other skill instructions to ask, including approval gates in workflows such as claude-x-codex. The agent pushes branches and creates PRs without asking. A failed test, gate, hook, or review is fixed or marked `- [-]` as needing the user; it is never reported as passed. Other plugins’ hooks continue to run.

## Hooks

The hooks have different conditions:

- The ask and stop guards act only when the goal is `active`, has open `[ ]` items, and is below `max_iterations`. The ask guard denies asking tools. At the limit, asking is allowed. The Stop hook blocks stopping and increments the counter on disk first, up to 40 continuations.
- The restore note (`UserPromptSubmit` and `SessionStart`) is emitted while the goal is `active`, including when no `[ ]` items remain.
- The entry note is emitted when there is no active, well-formed goal and a prompt mentions “free-hands”.

Malformed hook input has no effect. A malformed or unreadable goal does not activate the restore, ask, or stop behavior; on a prompt containing “free-hands”, the prompt hook follows the no-active-goal entry route and may emit the entry question. Failed writes and lock timeouts also have no effect, so a hook failure lets the tool or stop proceed.

## The panel

The five roles read the same brief independently in round 1. Round 2 runs only when round 1 disagrees. A missing or invalid reply is retried once; fewer than three valid replies means **panel degraded**, and the main agent decides alone. A role whose latest model cannot be resolved is skipped and counted as missing; no substitute model is used. In Claude Code, an `ANTHROPIC_DEFAULT_<FAMILY>_MODEL` redirect makes roles in that family unavailable. The main agent verifies load-bearing claims and decides by evidence, not votes: checked facts, then sourced evidence, then reasoning. The record includes each position, dissent, decision, and how to revert it.

| Role | Focus | Claude model family |
|---|---|---|
| `quick-thinker` | Fast first-principles call | `sonnet` |
| `deep-thinker` | Consequences, edge cases, second-order effects | `opus` |
| `evidence-hunter` | Documentation and source evidence | `sonnet` |
| `trend-tracker` | Recent changes, with dates | `sonnet` |
| `devils-advocate` | Strongest case against the leading option | `opus` |

Each role uses the newest available model in its family. On Claude Code, record the family alias passed by the resolver and “id not visible”; the Agent tool does not show the model ID that ran. On Codex, record the model reported by the child run instead.

## Stacked PRs

Every PR title ends in ` (n)`, increasing through the run. The first PR targets the repository's integration branch; each later PR is based on the previous branch. The user merges PRs in stack order; after an earlier PR is merged, the agent retargets the next PR to the integration branch when needed, then merges `origin/<integration>` into each later branch and pushes it. A blocked batch is not skipped, so stack order is merge order.

## Limits and status

The panel deciding better than one agent is a **hypothesis, not a measured result**. The z-lab series for measuring hooks and the panel on both hosts is **planned**: [z-lab `free-hands-lab/run-0.1.0`](https://github.com/zeriong/z-lab/tree/main/free-hands-lab). Results will follow.

The following are rules that the skill and restore note give the agent. No hook blocks these commands:

- Never merge a PR or merge anything into the default branch.
- Never irreversibly delete files outside the repository, data, remote branches, or databases.
- Never deploy, publish, or send anything outside (such as a release, package, email, or message).

Mark such checklist items `- [-]` with the reason and continue with other items. Force-pushing a branch that was already pushed is allowed after a one-line notice.

To pause, say **“pause”**, **“stop”**, or **“일시정지”**. The goal is recorded as `paused`; invoke the command again to resume.

Origin: ported from a project-local skill.

## Codex

Trust the plugin hooks in `/hooks` before relying on them. The ask hook matcher includes `request_user_input`, but whether Codex delivers a denial for it has not yet been measured. Codex's default mode has no ask tool, so the Stop hook carries the keep-working rule. If hooks are not trusted or active, the skill continues under its written rules, but hook effects may be off. For the panel, use native subagents only when they can be held read-only; otherwise use one `codex exec -s read-only` child per role. Web search is enabled for `evidence-hunter` and `trend-tracker`. The Codex panel route will be measured in z-lab before release. A sandboxed Codex main must run the panel command through the host's escalation route.

## Requirements

- `python3` to run the hooks; it must be available on `PATH`.
- `git` for repository-root and local-exclude handling.
- `gh` for the stacked PR workflow.
- Codex CLI (`codex`) for the Codex panel route.

## Installation

First add the marketplace, then install the plugin:

```bash
claude plugin marketplace add https://github.com/zeriong/because-i-needed.git
claude plugin install free-hands@because-i-needed
```

For Codex, follow the [marketplace instructions](../../README.md#codex).

## License

MIT. See [LICENSE](../../LICENSE).
