# Transport: standalone (no Orca)

Communication is one-way: you send a delegation prompt, the worker returns once.
Workers can't ask questions mid-task, so the delegation prompt must anticipate them and
the return's "Uncertain" section carries what's left. Blocking for the user (Gates 1
and 4, escalations) means stopping and asking in the conversation.

These forms were checked on Codex CLI 0.157.1 and Claude Code 2.1.283. CLI flags differ
between versions; check `codex exec --help` / `claude --help` once per session and adapt.

Rules that hold for every call below:

- **`CXC_MODE=off`** in front, so a worker or reviewer never receives the mode note and
  starts orchestrating itself.
- **`< /dev/null`** at the end. `codex exec` appends piped stdin to its prompt and waits
  for it, and an agent's shell may leave stdin open.
- Codex gets `-c 'project_doc_fallback_filenames=["CLAUDE.md"]'`, so it reads `CLAUDE.md`
  in directories without `AGENTS.md` (context-bridge.md, Layer 1).

## Worktrees

```bash
git worktree add .claude-x-codex/wt/<id> -b cxc/<feature>/<id>
<plugin>/scripts/worktree-setup.sh .claude-x-codex/wt/<id>   # materialize uncommitted context
# cleanup at finish
git worktree remove .claude-x-codex/wt/<id>
```

## Codex worker (`codex-bulk`)

```bash
F="$PWD/.claude-x-codex/<feature>"   # absolute: -C moves the agent's working root
CXC_MODE=off codex exec -m "${CXC_WORKER_MODEL:-gpt-6-luna}" \
  -C .claude-x-codex/wt/<id> -s workspace-write \
  -c 'project_doc_fallback_filenames=["CLAUDE.md"]' \
  -o "$F/returns/<id>.md" \
  "$(cat "$F/tasks/<id>.md")" < /dev/null
```

`-o` writes the agent's last message to the file; stdout carries the progress log.

## Codex reviewer

```bash
F="$PWD/.claude-x-codex/<feature>"; P=<plugin>/skills/run/references
CXC_MODE=off codex exec -m "${CXC_REVIEW_MODEL:-gpt-6-sol}" -c model_reasoning_effort="high" \
  -s read-only -c 'project_doc_fallback_filenames=["CLAUDE.md"]' \
  --output-schema "$P/review.schema.json" \
  -o "$F/reviews/<phase>-r<n>.json" \
  "$(cat "$F/reviews/<phase>-prompt.md")" < /dev/null
```

`--output-schema` makes the final message conform to the review schema. Use `medium`
effort for delta re-reviews and `CXC_FINAL_MODEL` for high-risk finals.

Codex profiles are separate files, `$CODEX_HOME/<name>.config.toml` (default
`~/.codex/cxc-review.config.toml`), selected with `--profile cxc-review`. A legacy
`[profiles.<name>]` table inside `config.toml` makes `--profile` fail on current CLIs;
the audit warns about it.

## Claude worker (`claude-fast`) from a Codex host

```bash
cd .claude-x-codex/wt/<id> && CXC_MODE=off claude -p "$(cat ../../<feature>/tasks/<id>.md)" \
  --model "${CXC_CLAUDE_WORKER:-sonnet}" --permission-mode acceptEdits \
  > ../../<feature>/returns/<id>.md < /dev/null
```

Grant only the permissions the task needs: `--permission-mode` (`acceptEdits` lets it
edit files) plus `--allowedTools` for the commands its "done when" runs. Put the prompt
right after `-p`: `--allowedTools` takes several values and would swallow a prompt
placed after it. From a Claude Code host, use a native subagent instead.

## Claude reviewer from a Codex host

```bash
CXC_MODE=off claude -p "$(cat .claude-x-codex/<feature>/reviews/<phase>-prompt.md)" \
  --model "${CXC_CLAUDE_REVIEWER:-opus}" \
  --allowedTools "Read" "Grep" "Glob" "Bash(git diff:*)" "Bash(git log:*)" \
  --json-schema "$(cat <plugin>/skills/run/references/review.schema.json)" \
  --output-format json < /dev/null \
  | jq '.structured_output' > .claude-x-codex/<feature>/reviews/<phase>-r<n>.json
```

With `--json-schema`, the conforming object is the `structured_output` field of the
JSON result. The allowed-tools list is what keeps the reviewer read-only: told to create a file,
this reviewer had Write and Bash denied, even with the user's `defaultMode` set to `auto`. Don't widen it.

## Parallelism

Launch ready tasks in the background (`&`) up to `CXC_PARALLEL`, then `wait`. Check
each return file exists and follows the return format before running its task gate.
