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
| `plan-smith-lab/` | The validation series for the plan-smith plugin: per-model plan corpora (`fable-plan/`, `opus-plan/`), pure-model 1-shot measurement (`pure-model/`), plan-to-weak-implementer transfer experiments (`transfer/`), total cost to a working artifact (`tco/`), controlled A/B rounds (`test/`), and analysis kept strictly apart from specimens (`analyze/`). The findings from this series became the evidence base for plan-smith releases v1.1 through v1.4. |

New experiment series get their own `<topic>-lab/` directory. Directory conventions live in CLAUDE.md, Article 9.
