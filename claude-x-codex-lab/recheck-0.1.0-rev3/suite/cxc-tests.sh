#!/usr/bin/env bash
# Deterministic checks for claude-x-codex scripts (plan §4 + extra cases), pass/fail per expectation.
# Run by runner.sh as probe S01: SUBJ=<snapshot> bash suite/cxc-tests.sh
set -u
REPO="${SUBJ:?set SUBJ to the snapshot dir (install.sh + .claude-plugin + plugins/claude-x-codex)}"
AP=$REPO/plugins/claude-x-codex
S=$AP/scripts
pass=0; fail=0
ok()   { pass=$((pass+1)); echo "  ok   $1"; }
bad()  { fail=$((fail+1)); echo "  FAIL $1"; [ -n "${2:-}" ] && printf '%s\n' "$2" | sed 's/^/       | /'; }
has()  { case "$2" in *"$3"*) ok "$1";; *) bad "$1" "$2";; esac; }
eq()   { [ "$2" = "$3" ] && ok "$1" || bad "$1" "got [$2] want [$3]"; }
unset CXC_MODE

echo "## 4-1 mode + hook"
T=$(mktemp -d); cd "$T" && git init -q; export XDG_CONFIG_HOME="$T/cfg"
M="bash $S/mode.sh"; H="bash $AP/hooks/mode-context.sh"
has "status default"            "$($M status)" "off (source: default)"
has "status default hint"       "$($M status)" "hint: '/claude-x-codex:mode on'"
$M on --global >/dev/null;       eq  "global on → get"        "$($M get)" "on"
$M on >/dev/null;                has "project overrides note" "$($M off --global)" "note: still on"
$M clear >/dev/null;             eq  "clear → global off"     "$($M get)" "off"
has "env override"              "$(CXC_MODE=on $M status)" "source: env:CXC_MODE"
echo "mode=maybe" > .claude-x-codex/mode; eq "invalid value ignored" "$($M get)" "off"
eq  "exclude entry"             "$(tail -1 .git/info/exclude)" ".claude-x-codex/"
$M on >/dev/null
out="$(echo '{"prompt":"build login"}' | CLAUDE_PLUGIN_ROOT=$AP $H)"; rc=$?
has "hook on → note" "$out" "[claude-x-codex: ON]"; eq "hook on exit" "$rc" 0
out="$(echo '{"prompt":"/claude-x-codex:mode off"}' | CLAUDE_PLUGIN_ROOT=$AP $H)"; rc=$?
eq  "hook skips toggle cmd" "$out" ""; eq "toggle exit" "$rc" 0
out="$(echo '{"prompt":"build login"}' | CXC_MODE=off CLAUDE_PLUGIN_ROOT=$AP $H)"
eq  "hook silent with CXC_MODE=off" "$out" ""
$M off >/dev/null
out="$(echo '{"prompt":"build login"}' | CLAUDE_PLUGIN_ROOT=$AP $H)"; rc=$?
eq  "hook off → silent" "$out" ""; eq "hook off exit" "$rc" 0
out="$(cd / && echo '{}' | bash $AP/hooks/mode-context.sh 2>&1)"; rc=$?
eq  "hook outside repo exit" "$rc" 0
cd /tmp; rm -rf "$T"; unset XDG_CONFIG_HOME

echo "## 4-2 context bridge"
export CODEX_HOME="$(mktemp -d)"     # never report the real ~/.codex
A=$(mktemp -d); cd "$A" && git init -q
mkdir -p .claude src/ui kg-out
echo "# rules" > CLAUDE.md; echo "# ui" > src/ui/CLAUDE.md; echo "local" > CLAUDE.local.md
echo '{"hooks":{"PreToolUse":[{"matcher":"Write","hooks":[{"type":"command","command":"./check.sh"}]}]}}' > .claude/settings.json
echo '{}' > .claude/settings.local.json; echo g > kg-out/graph.json
printf '.claude/settings.local.json\nCLAUDE.local.md\nkg-out/\n' > .gitignore
git add -A && git -c user.name=t -c user.email=t@t commit -qm init
before="$(git status --porcelain)"; out="$(bash "$S/context-audit.sh")"
eq  "audit read-only" "$(git status --porcelain)" "$before"
has "root GAP"         "$out" "| . | tracked | missing | GAP: Codex can't see this"
has "src/ui GAP"       "$out" "| src/ui | tracked | missing | GAP: Codex can't see this"
has "hook row"         "$out" "./check.sh"
has "gap local md"     "$out" "- CLAUDE.local.md (ignored)"
has "gap local json"   "$out" "- .claude/settings.local.json (ignored)"
has "candidate kg-out" "$out" "- kg-out/"
has "no profiles"      "$out" "cxc-*.config.toml | codex (user profiles) | none"
printf '[profiles.cxc-review]\nmodel = "x"\nproject_doc_fallback_filenames = ["CLAUDE.md"]\n' > "$CODEX_HOME/config.toml"
touch "$CODEX_HOME/cxc-worker.config.toml"
out="$(bash "$S/context-audit.sh")"
has "legacy warning"   "$out" "legacy [profiles.*] tables (cxc-review )"
has "file profile"     "$out" "codex (user profiles) | cxc-worker"
has "fallback inside a table is not top-level" "$out" "| . | tracked | missing | GAP: Codex can't see this"
has "table fallback not reported" "$out" "project_doc_fallback_filenames: unset"
printf 'project_doc_fallback_filenames = ["CLAUDE.md"]\n[profiles.cxc-review]\nmodel = "x"\n' > "$CODEX_HOME/config.toml"
out="$(bash "$S/context-audit.sh")"
has "fallback shown"   "$out" 'project_doc_fallback_filenames: ["CLAUDE.md"]'
has "fallback marks root ok"   "$out" "| . | tracked | missing | ok (Codex fallback in user config) |"
has "fallback marks nested ok" "$out" "| src/ui | tracked | missing | ok (Codex fallback in user config) |"

mkdir -p .claude-x-codex && printf 'copy CLAUDE.local.md\ncopy .claude/settings.local.json\nlink kg-out\nnope.txt\n' > .claude-x-codex/context-manifest
git worktree add -q .claude-x-codex/wt/T1 -b cxc/f/T1
out="$(bash "$S/worktree-setup.sh" .claude-x-codex/wt/T1)"
has "copy local md"    "$out" "copy: CLAUDE.local.md"
has "copy local json"  "$out" "copy: .claude/settings.local.json"
has "link kg-out"      "$out" "link: kg-out"
has "skip missing"     "$out" "skip (not in main tree): nope.txt"
[ -L .claude-x-codex/wt/T1/kg-out ] && ok "kg-out is a symlink" || bad "kg-out is a symlink"
out="$(bash "$S/worktree-setup.sh" .claude-x-codex/wt/T1)"
eq  "idempotent (4 skips)" "$(printf '%s\n' "$out" | grep -c '^skip')" 4
git worktree add -q .claude-x-codex/wt/T2 -b cxc/f/T2
out="$(cd .claude-x-codex/wt/T2 && bash "$S/worktree-setup.sh" .)"
has "from inside worktree" "$out" "copy: CLAUDE.local.md"
[ -f .claude-x-codex/wt/T2/.claude/settings.local.json ] && ok "inside-worktree copy landed" || bad "inside-worktree copy landed"
out="$(cd src/ui && bash "$S/worktree-setup.sh" ../../.claude-x-codex/wt/T2)"
has "from main-tree subdir" "$out" "skip (already in worktree): CLAUDE.local.md"

B=$(mktemp -d); cd "$B" && git init -q
echo "# agents" > AGENTS.md; mkdir pkg; echo "# pkg" > pkg/AGENTS.md; echo "@AGENTS.md" > pkg/CLAUDE.md
mkdir both; echo "# c" > both/CLAUDE.md; echo "# a" > both/AGENTS.md
git add -A && git -c user.name=t -c user.email=t@t commit -qm init
out="$(bash "$S/context-audit.sh")"
has "agents-only ok"   "$out" "| . | missing | tracked | ok (Claude Code falls back to AGENTS.md) |"
has "pointer ok"       "$out" "| pkg | tracked | tracked | ok (pointer) |"
has "independent CHECK" "$out" "| both | tracked | tracked | CHECK: Claude reads only CLAUDE.md, Codex only AGENTS.md"
cd /tmp; rm -rf "$A" "$B" "$CODEX_HOME"; unset CODEX_HOME

echo "## 4-3 installer"
I="bash $REPO/install.sh"
F=$(mktemp -d); printf '#!/bin/sh\necho "[claude $*]"\n' > "$F/claude"; chmod +x "$F/claude"; export PATH="$F:$PATH"
out="$($I --list)"
has "list header" "$out" "Marketplace: bin"
eq  "list count"  "$(printf '%s\n' "$out" | grep -c '^  ')" 4
out="$($I --only harness,claude-x-codex --dry-run)"
eq  "only → 2 installs" "$(printf '%s\n' "$out" | grep -c '^+ claude plugin install')" 2
has "only harness"      "$out" "+ claude plugin install harness@bin"
out="$($I --only nope 2>&1)"; rc=$?
eq  "unknown plugin exit" "$rc" 1; has "unknown plugin msg" "$out" "unknown plugin: nope"
printf '\033[B \n' > "$F/k1"; out="$(BIN_TTY="$F/k1" $I --scope project 2>/dev/null)"
eq  "first plugin excluded" "$(printf '%s\n' "$out" | grep -c 'plugin install plan-smith')" 0
eq  "others installed"      "$(printf '%s\n' "$out" | grep -c '\[claude plugin install .*--scope project\]')" 3
printf ' \n' > "$F/k2"; out="$(BIN_TTY="$F/k2" $I 2>/dev/null)"
eq  "All toggled off" "$out" "Nothing selected."
printf 'q' > "$F/k3"; out="$(BIN_TTY="$F/k3" $I 2>&1)"; rc=$?
eq  "quit exit" "$rc" 130; has "quit msg" "$out" "Cancelled."
out="$(BIN_TTY=/nonexistent $I --dry-run 2>&1 | head -1)"
has "no tty → all" "$out" "No terminal available"
out="$(cd /tmp && BIN_RAW_URL="file://$REPO" BIN_TTY=/nonexistent bash -s -- --list < "$REPO/install.sh")"
eq  "piped uses remote catalog" "$(printf '%s\n' "$out" | grep -c '^  ')" 4
out="$(cd /tmp && BIN_RAW_URL="file:///nonexistent" bash -s -- --list < "$REPO/install.sh" 2>&1)"; rc=$?
has "piped ignores cwd catalog (fails on bad URL)" "$out" "could not fetch marketplace.json"
rm -rf "$F"

echo; echo "passed=$pass failed=$fail"
[ "$fail" = 0 ]
