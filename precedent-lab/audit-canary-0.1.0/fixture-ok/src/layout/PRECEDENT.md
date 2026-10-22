## shell.css

### §container-queries — the shell layout steps on `@container` queries
- Decision: The shell layout in `src/layout/shell.css` steps on `@container` queries, not viewport `@media` width
  queries
- Reason: the shell renders inside split panes as narrow as 380px (2026-09-14).
