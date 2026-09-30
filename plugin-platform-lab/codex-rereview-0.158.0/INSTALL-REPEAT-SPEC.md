# Native installer repeat probe

Frozen before execution, 2026-09-30. Run the real install.sh with --host codex --all twice against a disposable local marketplace copy. Direct the child CLI to a disposable Codex configuration home, retaining no account credentials and making no changes to the real user configuration. No model calls, MCP startup, commits or publication. Capture both outputs, exits and elapsed time. First install and repeat must preserve a usable four-plugin registration or report an actionable failure. This local-source test does not prove remote network behavior.
