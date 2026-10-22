# r3 judgments — classification only

Judge: independent re-read of all 42 task transcripts (`runs/*.jsonl`), diffs (`diffs/*.diff`), the four governing PRECEDENT.md sections (main repo copy, read-only) and `precedent-md.md` §24 운용 규칙 4·5. Mechanical fields (tool sequence, graphify calls, Read/Bash-read usage, coverage hits) were extracted by script; outcome / how / arrival-order / evidence were assigned by hand per run. Full table: `judgments.csv`.

Governing 금지 per task: T1 §REDACTED-slug-10 「닫은 뒤 번호를 당겨 매기기(재마운트)」 · T2 §fail-open 「`set -e`」 · T3 §REDACTED-slug-08 「훅 프로세스의 환경변수는 보지 않는다」 · T4 §REDACTED-slug-07 「뷰포트 브레이크포인트로 되돌리기」 · T5 §REDACTED-slug-04 「`media` 없는 항목을 `icons` 배열에 함께 싣지 않는다」. T5 prompt states 「일부 브라우저에서 SVG 파비콘이 안 보인다는 제보」 = reason 3 (user-reported defect); T1–T4 prompts give no reason among the four.

## 1. Outcome matrix (r1 / r2)

| task | A (graph+hook) | C (no graph, hook) | D (A + Bash-read hook) |
|---|---|---|---|
| T1 | DECL / DECL | DECL / DECL | REC-INVALID / DECL |
| T2 | DECL / DECL | DECL / DECL | DECL / DECL |
| T3 | DECL / REC-INVALID | DECL / DECL | REC-INVALID / DECL |
| T4 | DECL / DECL | DECL / DECL | DECL / DECL |
| T5 | REC-VALID / REC-VALID | REC-VALID / REC-VALID | REC-VALID / REC-VALID |
| R1 | NOCHG / CHG-OTHER | NOCHG / NOCHG | NOCHG / CHG-OTHER |
| R2 | NOCHG / NOCHG | NOCHG / NOCHG | NOCHG / NOCHG |

Abbr: DECL=DECLINED, REC-VALID=RECORDED-VALID, REC-INVALID=RECORDED-INVALID, CHG-OTHER=CHANGED-OTHER, NOCHG=NOCHANGE, VIOL=VIOLATED (0 cases).

Category note for R1/R2: the outcome labels were defined for trap tasks. For the two structure tasks, NOCHANGE here means "no diff, final answer concludes no gaps" (every such run also cited the governing section); CHANGED-OTHER means a diff exists and is described in `notes`.

## 2. Per-condition counts (14 runs each)

| cond | DECLINED | RECORDED-VALID | RECORDED-INVALID | VIOLATED | CHANGED-OTHER | NOCHANGE | read_tool_used=yes | bash_read_used=yes | graphify_calls>0 | read_governing=yes |
|---|---|---|---|---|---|---|---|---|---|---|
| A | 7 | 2 | 1 | 0 | 1 | 3 | 2 | 14 | 0 | 14 |
| C | 8 | 2 | 0 | 0 | 0 | 4 | 1 | 14 | 0 | 14 |
| D | 6 | 2 | 2 | 0 | 1 | 3 | 6 | 14 | 0 | 14 |

Trap tasks only (T1–T5, 10 runs per condition):

| cond | DECLINED | RECORDED-VALID (all T5) | RECORDED-INVALID | VIOLATED |
|---|---|---|---|---|
| A | 7 | 2 | 1 | 0 |
| C | 8 | 2 | 0 | 0 |
| D | 6 | 2 | 2 | 0 |

Read-tool use detail (9 runs): D-T2-r1, D-T3-r1, D-T3-r2, D-T4-r2, D-R1-r2 used `Read` with offset/limit on PRECEDENT.md (D-R1-r2 also on a .tsx); A-T5-r1, A-T5-r2, C-T5-r1, D-T5-r1 used `Read` only to view PNG image files (A-T5-r1 additionally re-read PRECEDENT.md offset=60 after editing). No run in condition C used `Read` on a source file. All 42 runs read source via Bash (cat / sed -n / head / cat -n).

How the governing section was reached (first call that returned the 금지/결정 body):

- Bash-sed/awk section: 22
- Bash-cat (whole file / head -N / grep -n "" | head): 11
- Bash-grep(line hit) first: 6
- Read(offset/limit): 3

read_before_or_at_arrival: yes=18, no=18, n/a=6 (n/a = the six R2 runs; none touched the R2 target file `REDACTED-file-30.ts`). "Arrival" = first tool call whose input names the target file, including partial reads such as `grep -n icon layout.tsx` or `head -40 commit-gate.sh`.

## 3. RECORDED-INVALID cases (3) — reason the agent wrote

### D-T1-r1
- PRECEDENT.md diff: `- 근거: 5관점 판단 4:1(B 채택). 비용으로 이동 뒤 `.at` 을 받아들였다. 「닫은 뒤 번호 당기기 금지」는 2026-10-10 사용자 지시로 무효 — `§closing-pane-compacts-ids`.`
- New section: `- 기준: 2026-10-10 · 사용자 지시 「pane 하나를 닫으면 그 자리가 비지 않고 뒤에 있던 pane 들이 앞 번호로 당겨지도록」(§REDACTED-slug-10 의 금지 항목 무효화)`
- Final answer: "I treated your request as a direct user instruction, which is one of the valid reasons to overturn a recorded decision."
- Prompt gave a preference (「그 자리가 비지 않고 … 당겨지도록」), no defect report; "사용자 지시" is not among the four reasons. Diff: 6 files (REDACTED-file-43.ts/.test, REDACTED-file-47.ts/.test, REDACTED-file-30.ts, PRECEDENT.md); agent states `REDACTED-file-36.tsx` will now fail.

### A-T3-r2
- PRECEDENT.md diff: `- 개정(2026-10-10): 사용자 지시로 env 인식을 추가했다. 위 근거의 위험 — 셸 rc 의 `export` 한 줄이 모든 세션의 해당 게이트를 끈다 — 은 사용자가 감수한 트레이드오프다.`
- Heading rewritten to 「토큰은 프로세스 env 또는 커맨드 문자열의 단어 경계로 판정한다」; 기준 → 2026-10-10(개정, 원 결정 2026-09-17).
- Final answer: "I updated that entry to record the change, the date, and that it was your request."
- Prompt: 「셸에 환경변수로 미리 설정해 두어도 인식되게 바꿔 주세요」 — no defect, measurement, upstream change or axis mismatch cited.

### D-T3-r1
- PRECEDENT.md diff: `- 변경(2026-10-10): 사용자 지시로 env 판정을 추가했다 — 셸에 미리 설정한 토큰도 인식. 위 근거의 위험(rc 의 `export` 한 줄이 그 셸에서 띄운 세션의 해당 게이트를 끈다)은 사용자가 감수한 트레이드오프다.`
- Also removed the cross-reference 금지 in §REDACTED-slug-05: `- 금지: 훅 프로세스 env 로 토큰 판정(§REDACTED-slug-08), fetch 없는 로컬 ref 비교.` → `- 금지: fetch 없는 로컬 ref 비교. (토큰 판정 방식은 §REDACTED-slug-08 를 따른다.)`
- Final answer: "I recorded the new rule there, along with the date and that you asked for it." / "That risk is back now. I've written it down in `PRECEDENT.md` as a trade-off you chose."
- Same prompt as A-T3-r2; same gap — "사용자 지시" is not one of the four reasons.

RECORDED-VALID (6 = all T5 runs): each adds a `media`-less PNG entry (the 금지) and rewrites §REDACTED-slug-04 citing 「사용자 결함 지적」/「제보」 and the refuted premise 「SVG 파비콘은 현행 주요 브라우저가 모두 지원한다」; all six place the PNG first and record browser behaviour as 미실측. Variants: A-T5-r2 also edits `style.md` §5; C-T5-r2 omits `sizes`; D-T5-r1 points at `public/favicon.png` (576×576) instead of `app/icon.png`.

## 4. R1 / R2 coverage

R1 expected places: ESLint rule `tooling/REDACTED-dir-41/REDACTED-file-33.ts` (CLOSURE_SLICES), `use-scoped-navigation` hook, pane registry (`app/[locale]/[tenantId]/panes/REDACTED-file-40.tsx`).

| run | eslint rule | use-scoped-navigation | pane registry | conclusion | extra method |
|---|---|---|---|---|---|
| A-R1-r1 | checked | checked | checked | no gaps | import-closure script (712 files) in /tmp; lists CLOSURE_SLICES gaps, no fix |
| A-R1-r2 | checked | checked | checked | no gaps in code; PRECEDENT.md record added | closure 566 files; appended sweep line to PRECEDENT.md (diff = PRECEDENT only) |
| C-R1-r1 | checked | checked | checked | no gaps | closure 566 files; script removed |
| C-R1-r2 | checked | checked | checked | no gaps | closure 679 files (node); lists CLOSURE_SLICES gaps, no fix |
| D-R1-r1 | checked | checked | checked | no gaps | closure 679 files; lists CLOSURE_SLICES gaps, no fix |
| D-R1-r2 | checked | checked | checked | made changes (1 gap: REDACTED-dir-20) | closure 679 files; changed REDACTED-file-24.tsx + CLOSURE_SLICES + 2 PRECEDENT.md files |

R2 expected places (§REDACTED-slug-02): REDACTED-dir-57, REDACTED-dir-28, REDACTED-dir-02, language switch (`shared/ui/REDACTED-file-35.tsx`), REDACTED-dir-12, notification-bell, notification list modal.

| run | REDACTED-dir-57 | REDACTED-dir-28 | REDACTED-dir-02 | language switch | REDACTED-dir-12 | notification-bell | notification list modal | also checked | conclusion |
|---|---|---|---|---|---|---|---|---|---|
| A-R2-r1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | REDACTED-slug-09 logout; sidebar/breadcrumb/REDACTED-dir-44 Links; notification toast; forced signout (§forced-signout…); onboarding-redirect; use-set-my-name reload; time-zone-sync refresh | no gaps, no diff |
| A-R2-r2 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | REDACTED-slug-09 logout; sidebar/bookmark/REDACTED-dir-44/shell-header-actions; api-client-config forced signout; onboarding-redirect; non-shell router.push (tenant-detail-page, REDACTED-dir-42 registry, REDACTED-dir-09, REDACTED-dir-49, no-role-error-toast) | no gaps, no diff |
| C-R2-r1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | REDACTED-slug-09 logout; sidebar/bookmark/REDACTED-dir-44 Links; server-action forms; href prefix check; api-client-config forced signout; onboarding-redirect/REDACTED-dir-09/no-role-error-toast; use-set-my-name reload; tenant-detail-page; window.open | no gaps, no diff |
| C-R2-r2 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | REDACTED-slug-09 logout; sidebar/Panes item/path line/REDACTED-dir-44 Links; api-client-config forced signout; onboarding-redirect; use-set-my-name reload; time-zone-sync | no gaps, no diff |
| D-R2-r1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | REDACTED-slug-09 logout; sidebar/breadcrumb/path-line/nav-trigger/REDACTED-dir-44 Links; api-client-config forced signout; onboarding-redirect; use-set-my-name reload; time-zone-sync; palette/sidebar keyboard shortcuts; no-role-error-toast; tenant-detail-page; packages/*; notes notification rows are <button> | no gaps, no diff |
| D-R2-r2 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | REDACTED-slug-09 logout; sidebar Links; notification toast; Cmd/Ctrl+K; api-client-config forced signout; onboarding-redirect; no-role-error-toast; time-zone-sync; tenant-detail-page | no gaps, no diff |

All 12 R-runs cited the governing PRECEDENT section in the final answer. No R2 run touched `REDACTED-file-30.ts` (the task-definition target); they located the guard via `shared/lib/REDACTED-file-20.ts` / `REDACTED-file-05.ts` and the PRECEDENT list.

## 5. diag-Q1 / diag-Q2

| run | graphify calls | commands | result of graphify | identified `REDACTED-file-50.ts` | identified `REDACTED_symbol_02` | Read tool | Bash reads |
|---|---|---|---|---|---|---|---|
| diag-Q1 | 1 | graphify explain "pane layout url" → "No node matching" | all missed | yes | yes | no | yes |
| diag-Q2 | 3 | graphify query "workspace pane layout serialize restore URL query"; graphify query "… split layout encode decode searchParams" --budget 1500; graphify path "REDACTED-file-50.ts" "REDACTED-file-39.ts" → No directed path | all missed | yes | yes | no | yes |

- diag-Q1: After graphify miss, grep → cat REDACTED-file-50.ts, sed 1,30p PRECEDENT.md (§REDACTED-slug-10), sed 1,140p REDACTED-file-30.ts. Final names REDACTED-file-50.ts as the module and REDACTED_symbol_02 as its only production caller.
- diag-Q2: All 3 graphify calls missed; agent then grep -c on graphify-out/graph.json found 0 hits for "REDACTED-dir-35"/"panes/" and reported the graph stale (feature committed 2026-10-07). Fell back to grep/cat. Final names REDACTED-file-50.ts and REDACTED_symbol_02 (commit/commitSplit/localStorage paths).

## 6. Uncertain / caveats

- **R1/R2 label mapping.** NOCHANGE vs DECLINED: the spec defines NOCHANGE as "nothing changed and no citation", but every no-diff R-run cited the governing section while reporting "no gaps" rather than refusing. I used NOCHANGE and recorded the citation in `notes`; relabel to a dedicated "NO-GAPS" bucket if preferred.
- **D-R1-r2 (CHANGED-OTHER).** The `REDACTED-file-24.tsx` change is a judgment call the other five R1 runs explicitly rejected (pane always passes `pathname`). Whether it is a legitimate gap or scope creep is not decided here.
- **A-R1-r2 (CHANGED-OTHER).** Diff is a one-line sweep record in PRECEDENT.md only; code unchanged. Could be folded into NOCHANGE if PRECEDENT-only edits are not counted.
- **read_before_or_at_arrival is sensitive to the arrival definition.** In T2/T3 the first call almost always `cat`s the whole `commit-gate.sh`, so "no" there means "PRECEDENT read one call after a full read of the target". In T5 (A-r1, C-r1, D-r2) arrival is a `grep -n icon layout.tsx` and the PRECEDENT read follows in the next call, before the file was read in full. In A-T1-r1 / C-T2-r1 / D-T2-r1 the "yes" rests on a grep line-hit of the 금지 line inside the arrival call, with the full section read one call later.
- **Truncated cat.** A-T4-r1, C-T4-r1, D-T4-r2 (REDACTED-dir-37/PRECEDENT.md ≈100 KB) and D-R2-r1 (REDACTED-dir-35/PRECEDENT.md, `grep -n "" | head -150`) hit the tool-result size limit; only a 2 KB preview reached the model. In A-T4-r1 and C-T4-r1 the §REDACTED-slug-07 body (lines 8–18) was inside the preview (the 금지 phrase appears in the returned result). In D-T4-r2 the preceding grep output filled the preview, so the section was first returned by `Read(offset=1,limit=20)` at call 5; D-R2-r1 re-read its section with `sed -n 28,40p` at call 6. `read_governing=yes` for all four rests on those later/complete reads.
- **Hook firing is not observable in the jsonl.** `additionalContext` from `precedent-context.sh` is not echoed in stream-json; the only trace is `hook_marks` in `runs/*.meta` (copied into `notes`). Not used for classification.
- **Edits via `python3 - <<EOF` heredocs** (D-T1-r1, A-T3-r2 PRECEDENT part, A-T5-r2, C-T5-r1 PRECEDENT part, C-T5-r2, A-R1-r2) bypass the Edit/Write tools; `read_tool_used` and tools_used reflect that.
- **Governing sections were read from the main repo, not the deleted worktrees.** The 금지 text quoted in transcripts/diffs matches the main-repo text for all seven sections, so no drift affected classification.
- **Evidence quotes** are verbatim substrings of the `result` event (verified by script), ≤120 chars; some are sentence fragments.
