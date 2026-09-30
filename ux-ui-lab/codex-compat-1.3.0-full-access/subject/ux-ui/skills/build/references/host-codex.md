# Codex execution adapter (web and mobile)

Use `$ux-ui:build` for web and `$ux-ui:build-mobile` for mobile. The measurement
matrices, review rubrics, three-cycle limit and staged-diff approval contract are shared
with Claude Code.

## Bootstrap

- Discover the actual MCP tools exposed by this session for `chrome-devtools`,
  `mobile-mcp`, `ios-simulator` and `flutter`. Claude's `mcp__plugin_ux-ui_*` prefix
  is not a requirement on Codex. Match server identity and capabilities, not a guessed
  tool name. Retain the web bootstrap's missing-browser stop and the mobile backend
  selection/fallback rules.
- The plugin bundles the same four servers in `.mcp.json`. Node/Chrome and mobile
  SDK requirements still apply. Installing a plugin does not boot a device or install
  an SDK. Start only the backend needed for the task.
- Verify the enabled plugin's `PreToolUse` hook in `/hooks`. Codex must trust the
  current hook definition before it runs; a plugin installation alone is insufficient.
  If hooks are disabled, unsupported or untrusted, report that the automatic commit
  gate is inactive and wait for setup before claiming this workflow's hard gate works.
  Do not silently replace it with a promise to remember.

## Art director dispatch

For web use `<plugin>/agents/ux-ui-art-director.md`; for mobile use
`<plugin>/agents/ux-ui-mobile-art-director.md`. Read the body below its Claude YAML
frontmatter and give it to a fresh Codex reviewer. Include absolute paths to the
measurement directory, relevant source, rubric and design-principle references.

Use a fresh read-only reviewer execution route; inherit the session's model/effort
instead of passing the Claude `opus` alias. If the host cannot restrict a subagent to
read-only execution, write a self-contained prompt file and start a separate process:

```bash
codex exec --ephemeral -s read-only \
  -m <resolved-main-model> -c 'model_reasoning_effort="<main-effort>"' \
  -C <absolute-project-root> - < <absolute-review-prompt>
```

The reviewer must open the real screenshots with its image-viewing tool. A reviewer
without the required MCP can inspect the saved artifacts and request missing captures
from the main agent. Missing pixels or missing required states require
`CHANGES_REQUIRED`, never an inferred approval. It must not edit source or create an
approval artifact. Wait for its verdict before continuing the shared loop.

Each retry starts a new reviewer. If no independent read-only route exists, stop and
report the missing capability. Run the existing approval command only after APPROVED;
no adapter may weaken the binding to the staged UI diff.
