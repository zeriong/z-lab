# Codex setting parity findings

## U04 — Real measured review and missing-capture behavior

A real Chrome headless process produced the desktop PNG but did not exit within 45 seconds. The timeout and original PNG are preserved in `runs/web/`; it was not silently counted as a successful capture command. A new frozen web-review probe copied those exact PNG bytes. The real read-only art-director process opened the image and returned CHANGES_REQUIRED, identifying the UUID, low contrast and small control while explicitly reporting absent states and audits.

A separate real mobile director read the absent-device fixture and returned CHANGES_REQUIRED with no invented screenshots or approval. Both use actual shipped role/rubric definitions. The probes set the reviewer environment variables but directly launch the review role; they do not measure outer-loop propagation of a model different from the main session. Explicit dispatch configuration is documented in the shared Codex adapter.

## U05 — Configuration and unchanged enforcement

Both actual host manifests declare the same four MCP servers. Runtime discovery reports all four and the commit hook. README settings cover per-server enablement and UX_UI_GLOBS. The shared suite checks denial, approval and stale staged-diff rejection with both host payload forms. Core art-director bodies, review rubrics and mobile capture script remain byte-identical to HEAD.

## Not measured

No complete multi-state browser build/review loop, real mobile device capture, SDK setup or accessibility/performance audit was performed in these probes. Hook trust remains an installation step; declaration discovery alone is not enforcement proof. Cross-model quality equivalence and every environment are outside this compatibility claim.
