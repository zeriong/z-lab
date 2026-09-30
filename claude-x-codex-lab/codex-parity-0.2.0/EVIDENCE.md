# Shared deterministic source run

C05/C06 executed in `test_linked_worktree_mode_exclusion_and_override_audit` and `test_mode_prompt_hook_and_context_audit`. The actual scripts are called against disposable Git repositories, including a detached linked worktree cloned from existing history without creating commits.

Raw command result and duration: [commands.json](../../plugin-platform-lab/codex-parity-0.158.0/runs/post-bypass/commands.json). Exact test assertions: [test_compatibility.py](../../plugin-platform-lab/codex-parity-0.158.0/test_compatibility.py). Source hashes: [source-sha256.json](../../plugin-platform-lab/codex-parity-0.158.0/runs/post-bypass/source-sha256.json). Full-suite duration includes other plugins and is not attributed solely to CXC.
