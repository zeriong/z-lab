"""E7 orchestrator frame, copied from ../leaf-2.1.309/prompts.py (orchestrator() only)."""


def orchestrator(request, sub_model=None):
    model = f', model "{sub_model}"' if sub_model else ""
    return (f"{request}\n\n"
            "You are the orchestrator for this task. Hand the implementation to one subagent with the Agent tool "
            f'(subagent_type "general-purpose"{model}) and give it what it needs. Don\'t edit files yourself. '
            "When the subagent returns, check its result and report to me.")

