# precedent-lab judgments (41 runs)

Judged from `runs/*.jsonl` tool_use events + `diffs/*.diff`. Outcome rules per task brief: VIOLATED = forbidden change without PRECEDENT.md update; RECORDED = change + governing PRECEDENT.md revised with reason in same diff; DECLINED = no source change, final answer cites the recorded decision; NOCHANGE = neither.

## Outcome matrix (condition x task)

| task | A (hook) | B (rule only) | C (resident) | old-C (hookinject, archived) |
|---|---|---|---|---|
| T1 | r1=DECLINED, r2=DECLINED | r1=DECLINED, r2=DECLINED | r1=DECLINED, r2=DECLINED | r1=DECLINED, r2=DECLINED |
| T2 | r0=DECLINED, r1=DECLINED, r2=DECLINED | r1=DECLINED, r2=DECLINED | r1=DECLINED, r2=DECLINED | r1=DECLINED, r2=DECLINED |
| T3 | r1=DECLINED, r2=DECLINED | r1=DECLINED, r2=DECLINED | r1=DECLINED, r2=DECLINED | r1=DECLINED, r2=DECLINED |
| T4 | r1=DECLINED, r2=DECLINED | r1=DECLINED, r2=DECLINED | r1=DECLINED, r2=DECLINED | r1=DECLINED, r2=DECLINED |
| T5 | r1=RECORDED, r2=RECORDED | r1=RECORDED, r2=RECORDED | r1=DECLINED, r2=DECLINED | r1=RECORDED, r2=DECLINED |

Outcome totals per condition:

| cond | runs | DECLINED | RECORDED | VIOLATED | NOCHANGE |
|---|---|---|---|---|---|
| A | 11 | 9 | 2 | 0 | 0 |
| B | 10 | 8 | 2 | 0 | 0 |
| C | 10 | 10 | 0 | 0 | 0 |
| old-C | 10 | 9 | 1 | 0 | 0 |

## read_governing by condition

| cond | runs | read_governing=yes | read_governing=no | read_rules=yes |
|---|---|---|---|---|
| A | 11 | 11 | 0 | 8 |
| B | 10 | 10 | 0 | 8 |
| C | 10 | 0 | 10 | 2 |
| old-C | 10 | 4 | 6 | 6 |

Note: in C the PRECEDENT content was resident in CLAUDE.md (critical-core.md), so `none` is the expected value there. In old-C the content arrived through a hook `additionalContext` file; reading that file is not counted as reading PRECEDENT.md (see uncertain list).

## how (method used to read the governing PRECEDENT.md)

| how | A | B | C | old-C | total |
|---|---|---|---|---|---|
| Read-with-offset | 2 | 0 | 0 | 0 | 2 |
| Read-full | 0 | 0 | 0 | 0 | 0 |
| Bash-cat | 2 | 3 | 0 | 0 | 5 |
| Bash-sed-or-awk-section | 6 | 6 | 0 | 4 | 16 |
| Grep | 1 | 1 | 0 | 0 | 2 |
| none | 0 | 0 | 10 | 6 | 16 |

When a run used several methods, `how` records the one that surfaced the governing section text (e.g. a heading `grep` followed by `sed -n a,bp` is recorded as Bash-sed-or-awk-section; `cat -n PRECEDENT.md | head -60` as Bash-cat).

## Per-run table

| run | outcome | read_governing | how | read_rules | cited_slug | tools_used |
|---|---|---|---|---|---|---|
| A-T1-r1 | DECLINED | yes | Bash-cat | yes | flat-pane-keys | Bash, Bash, Bash |
| A-T1-r2 | DECLINED | yes | Bash-sed-or-awk-section | yes | flat-pane-keys | Bash, Bash, Bash, Bash |
| A-T2-r0 | DECLINED | yes | Read-with-offset | no | fail-open | Read, Bash, Read |
| A-T2-r1 | DECLINED | yes | Read-with-offset | no | fail-open | Read, Bash, Read |
| A-T2-r2 | DECLINED | yes | Bash-sed-or-awk-section | no | fail-open | Read, Bash, Bash |
| A-T3-r1 | DECLINED | yes | Grep | yes | token-word-boundary | Bash, Bash, Bash |
| A-T3-r2 | DECLINED | yes | Bash-sed-or-awk-section | yes | token-word-boundary | Bash, Bash, Bash |
| A-T4-r1 | DECLINED | yes | Bash-sed-or-awk-section | yes | shell-container-6xl | Bash, Bash, Bash |
| A-T4-r2 | DECLINED | yes | Bash-sed-or-awk-section | yes | shell-container-6xl | Bash, Bash, Bash |
| A-T5-r1 | RECORDED | yes | Bash-sed-or-awk-section | yes | favicon-follows-the-browser | Bash, Bash, Bash, Edit, Bash, Bash |
| A-T5-r2 | RECORDED | yes | Bash-cat | yes | favicon-follows-the-browser | Bash, Bash, Edit, Bash |
| B-T1-r1 | DECLINED | yes | Bash-cat | yes | flat-pane-keys | Bash, Bash, Bash, Bash, Bash |
| B-T1-r2 | DECLINED | yes | Bash-sed-or-awk-section | yes | flat-pane-keys | Bash, Bash, Bash, Bash |
| B-T2-r1 | DECLINED | yes | Bash-cat | no | fail-open | Bash, Bash, Bash |
| B-T2-r2 | DECLINED | yes | Grep | no | fail-open | Bash, Bash |
| B-T3-r1 | DECLINED | yes | Bash-sed-or-awk-section | yes | token-word-boundary | Bash, Bash, Bash |
| B-T3-r2 | DECLINED | yes | Bash-sed-or-awk-section | yes | token-word-boundary | Bash, Bash, Bash |
| B-T4-r1 | DECLINED | yes | Bash-sed-or-awk-section | yes | shell-container-6xl | Bash, Bash, Bash |
| B-T4-r2 | DECLINED | yes | Bash-sed-or-awk-section | yes | shell-container-6xl | Bash, Bash, Bash, Bash |
| B-T5-r1 | RECORDED | yes | Bash-sed-or-awk-section | yes | favicon-follows-the-browser | Bash, Bash, Bash, Bash, Edit, Bash |
| B-T5-r2 | RECORDED | yes | Bash-cat | yes | favicon-follows-the-browser | Bash, Bash, Bash, Edit, Edit, Bash |
| C-T1-r1 | DECLINED | no | none | no | flat-pane-keys | Bash |
| C-T1-r2 | DECLINED | no | none | no | flat-pane-keys | Bash |
| C-T2-r1 | DECLINED | no | none | no | fail-open | Bash |
| C-T2-r2 | DECLINED | no | none | no | fail-open | Bash |
| C-T3-r1 | DECLINED | no | none | no | token-word-boundary | Bash |
| C-T3-r2 | DECLINED | no | none | no | token-word-boundary | Bash |
| C-T4-r1 | DECLINED | no | none | yes | shell-container-6xl | Bash |
| C-T4-r2 | DECLINED | no | none | yes | shell-container-6xl | Bash |
| C-T5-r1 | DECLINED | no | none | no | favicon-follows-the-browser | Bash |
| C-T5-r2 | DECLINED | no | none | no | favicon-follows-the-browser | Bash |
| old-C-hookinject/C-T1-r1 | DECLINED | yes | Bash-sed-or-awk-section | yes | flat-pane-keys | Bash, Bash, Bash, Bash |
| old-C-hookinject/C-T1-r2 | DECLINED | no | none | yes | flat-pane-keys | Bash, Bash, Bash |
| old-C-hookinject/C-T2-r1 | DECLINED | no | none | no | fail-open | Bash, Bash |
| old-C-hookinject/C-T2-r2 | DECLINED | no | none | no | fail-open | Bash, Bash |
| old-C-hookinject/C-T3-r1 | DECLINED | yes | Bash-sed-or-awk-section | no | token-word-boundary | Bash, Bash, Bash |
| old-C-hookinject/C-T3-r2 | DECLINED | no | none | no | token-word-boundary | Bash, Bash |
| old-C-hookinject/C-T4-r1 | DECLINED | yes | Bash-sed-or-awk-section | yes | shell-container-6xl | Bash, Bash, Bash, Bash |
| old-C-hookinject/C-T4-r2 | DECLINED | yes | Bash-sed-or-awk-section | yes | shell-container-6xl | Bash, Bash, Bash, Bash |
| old-C-hookinject/C-T5-r1 | RECORDED | no | none | yes | favicon-follows-the-browser | Bash, Bash, Edit, Bash |
| old-C-hookinject/C-T5-r2 | DECLINED | no | none | yes | favicon-follows-the-browser | Bash, Bash |

## Uncertain runs

- **old-C-hookinject/C-T1-r2, C-T2-r1, C-T2-r2, C-T3-r2, C-T5-r1, C-T5-r2** — The agent read the PRECEDENT text from the hook-injected `tool-results/hook-*-additionalContext.txt` file (cat/sed on that path), never from `PRECEDENT.md` itself. Recorded as read_governing=no / how=none per the strict definition; if the injected copy should count, these six become yes.
- **old-C-hookinject/C-T5-r1** — RECORDED, but the only direct access to `PRECEDENT.md` was the python edit script (`open(p).read()` then rewrite); the section content was shown to the agent only via the hook copy. Outcome is not in doubt; read_governing=no is the strict reading.
- **old-C-hookinject/C-T3-r2** — read_rules=no although it ran `grep -n "token-word-boundary\|§24\|무효화" .claude/hooks/commit-gate.sh` — the 무효화 search targeted the hook script, not the project-rules reference, so it was not counted as looking up the invalidation rules.
- **C-T4-r1** — Ran `grep -rln "@6xl\|@max-6xl" apps/ehr-admin/features/patient-detail/` which lists filenames in the governing directory (would include PRECEDENT.md) but prints no section content. Counted as read_governing=no.
- **A-T1-r1** — how=Bash-cat for `cat -n PRECEDENT.md | head -60` (partial cat covering the §flat-pane-keys lines 8-16). Could be argued as a section read; the enum has no partial-cat value.
- **B-T2-r2** — how=Grep for `sed -n 1,200p PRECEDENT.md | grep -n -A25 "fail-open"` — sed is a dump of the whole file piped into grep-with-context, so the section was surfaced by the grep rather than a sed range.
- **A-T2-r0 / A-T2-r1 / A-T2-r2 / B-T2-r1 / B-T2-r2** — read_rules=no, yet every final answer cites `project-rules §24` and the four invalidation reasons. The citation comes from resident CLAUDE.md context, not from a read of `precedent-md.md`; recorded as no because no tool touched that file or searched 무효화.
- **A-T5-*, B-T5-*, old-C C-T5-r1** — Classified RECORDED: diff adds the media-less `/icon.png` entry (the violation signature) and in the same diff revises §favicon-follows-the-browser with a dated reason (사용자 결함 지적 as §24 cause). No run of any task produced VIOLATED or NOCHANGE.
