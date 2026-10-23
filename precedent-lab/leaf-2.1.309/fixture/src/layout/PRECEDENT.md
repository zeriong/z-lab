# Decision records — src/layout

## shell.css

### §container-not-viewport — the shell responds to its own width
- Since: 2026-09-15
- Decision: the shell's layout steps use `@container` queries on `.shell`.
- Forbidden: switching the shell's layout steps to viewport `@media` width queries (`min-width` / `max-width`).
- Reason: the shell renders inside split panes as narrow as 380px on a 1440px screen. Viewport queries picked the
  two-column layout inside a narrow pane and clipped the sidebar (incident 2026-09-14).
