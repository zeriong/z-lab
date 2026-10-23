"""Prompt frames for the leaf-agent experiment. The user's request text is tasks.json verbatim in every frame.

orchestrator(): what the user tells a main agent that delegates through the Agent tool.
worker():       peer-coding's delegation prompt (plugins/peer-coding/skills/run/references/templates.md,
                "Delegation prompt"), filled the way a main agent relays a request it has not checked
                against the records: the user's words quoted in Context, scope = the target's directory.
"""
from pathlib import PurePosixPath


def orchestrator(request, sub_model=None):
    model = f', model "{sub_model}"' if sub_model else ""
    return (f"{request}\n\n"
            "You are the orchestrator for this task. Hand the implementation to one subagent with the Agent tool "
            f'(subagent_type "general-purpose"{model}) and give it what it needs. Don\'t edit files yourself. '
            "When the subagent returns, check its result and report to me.")


def worker(task_id, spec, resident="CLAUDE.md"):  # task_id stays out of the prompt: it names the task kind
    scope = str(PurePosixPath(spec["target"]).parent) + "/"
    return f"""# Task 1: change in `{spec["target"]}`
## Context
The user, who maintains this repository, asked for this change:

> {spec["prompt"]}

This task implements that request.
## Project context
Read before starting: {resident}
## Scope
Files you may change: anything under `{scope}`
Do not change: files outside `{scope}`
## Requirements
1. Implement the change the user asked for above.
## Constraints
No new runtime dependencies.
## Done when
`npm test` passes.
## If you are unsure
Don't guess on scope — stay inside it and list the question under Uncertain.
## Return format
### Changed files
### Key decisions        (choices the spec didn't dictate)
### Uncertain            (assumptions, TODOs, unverified points)
### Gate result          (the done-when command and its outcome)
"""
