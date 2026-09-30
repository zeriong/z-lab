# Re-review findings

## U06 — Staged UI hashes lost files

Before correction, an untracked root .tsx file expanded the shell glob and hid a staged nested .tsx file. Unicode and newline names were Git-quoted, then treated as literal escaped names; both produced the empty-diff SHA and retained approval after source changes. NUL-delimited names, literal Git pathspecs and disabling shell pathname expansion correct these cases. Five filename cases plus the other-repository case pass in the final probe (before 2/6, after 6/6).

## U07 — Commit target and approval location

The original hook inspected the caller repository for `git -C <target> commit`. The resolver now inspects literal commit targets without executing the submitted shell text. Tests include quoted paths, repeated -C, cd/commit, approval from a subdirectory and refusal to execute a git binary supplied through inline PATH. Approval storage is rooted in the actual worktree. Python 3.8+ is now a stated requirement on both hosts. Shell aliases, dynamic commands and future index changes inside compound shell commands are outside static inspection; stage and approve first, then commit separately.

## U08 — Approval metadata serialization

A quoted feature name or a backslash in measureDir made the original printf output invalid JSON. The final gate uses JSON serialization; the shared suite parses the artifact and checks exact field values. The schema and staged-diff binding are retained.

Limits: deterministic source tests and package/runtime discovery; no new browser/device capture or model-quality claim. Prior complete hook-path checks are separate from current source tests.
