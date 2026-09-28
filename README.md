# z-lab

*Read this in other languages: [한국어](./README.ko.md)*

A space for validating experiments on plugins headed for release — plus whatever smaller experiments come up along the way.

Nothing here is a product. Every piece of work in this repository exists to produce one thing: a **measured finding with its evidence attached**. Only findings that survive validation graduate into actual plugin releases (for example, [plan-smith](https://github.com/zeriong/plan-smith)).

## How the lab operates

Experiment design, contamination control, and record-keeping are codified as law in [CLAUDE.md](./CLAUDE.md) — every article was written after an actual failure in this repository. The essentials:

- **Never touch the specimen.** Verifying, reviewing, or self-correcting an experiment's output destroys the ability to say what was measured.
- **Enforce bans structurally, not with prompts.** Remove the tool; don't ask the agent to abstain.
- **An experiment ends when its record is complete** — input spec, per-arm artifacts, `METRICS.md`, and a findings document. All four, or it isn't done.
- **Claim nothing unmeasured.** Every report separates what was measured from what was not.

## Experiment series

| Directory | Contents |
|---|---|
| `plan-smith-lab/` | The validation series for the plan-smith plugin: per-model plan corpora (`fable-plan/`, `opus-plan/`), pure-model 1-shot measurement (`pure-model/`), plan-to-weak-implementer transfer experiments (`transfer/`), total cost to a working artifact (`tco/`), the 1.6 plan split run with the real writer on corpus plans (`split-1.6.0/`), controlled A/B rounds (`test/`), and analysis kept strictly apart from specimens (`analyze/`). The findings from this series became the evidence base for plan-smith releases v1.1 through v1.4 and v1.6. |
| `claude-x-codex-lab/` | The validation series for the claude-x-codex plugin (Claude × Codex peer orchestration). `env-probes-0.1.0/` re-runs every CLI behavior the 0.1.0 skills rely on — which instruction files each vendor reads, schema-enforced review output, read-only reviewers, the transport command forms end to end, and the cost of the mode note — in isolated fixtures, 3 runs per model probe, plus a deterministic script suite. Follow-up rounds (`recheck-*`, `reviewer-*`) measured the fixes the findings led to, `effort-flags-0.1.0/` checked the reviewer and worker effort settings before they were written down, and `analyze/` links each change — and each user decision — to its evidence, with model usage totals. |
| `plugin-platform-lab/` | Claude Code plugin-system behavior, measured with minimal plugins and an isolated config: where a skill's invocation name comes from, what a marketplace or plugin rename does to existing installs, installer exit codes, hook auto-loading (with a follow-up, `hook-injection-2.1.283/`), `disable-model-invocation`, and where `${CLAUDE_PLUGIN_ROOT}` is substituted — in a skill's SKILL.md text but not in a reference file it reads later, nor in the shell (`skill-plugin-root-2.1.283/`, `reference-plugin-root-2.1.283/`), and two ways a reference can still reach a script (`reference-pointer-2.1.283/`). |

New experiment series get their own `<topic>-lab/` directory. Directory conventions live in CLAUDE.md, Article 9.
