# env-probes-0.1.0 지표

`python3 metrics.py > METRICS.md` 로 생성한다 — 손으로 고치지 않는다. 토큰·비용·`dur`(duration_ms)은 CLI 자가보고,
`wall` 은 러너가 잰 벽시계 ms. Claude 입력 토큰 `in` = input + cache_creation + cache_read. Codex `in` = input_tokens(캐시 포함), `cached` 는 그중 캐시분.
S01·X16·X17·O01 전 arm과 X05 r1·X09 r1은 카나리 호출(`REPS=1`)에서 나온 단위다 — FINDINGS의 '실행 단위의 출처'.

## 지침 파일 — Codex (X01–X04)

### X01 `CLAUDE.md`만, 폴백 유무

| arm | run | 답 | PINEAPPLE-42 포함 | 실행한 명령 | in | cached | out | wall |
|---|---|---|---|---|---|---|---|---|
| fallback | r1 | PINEAPPLE-42 | yes | 0 | 14,198 | 11,008 | 9 | 3,776 |
| fallback | r2 | PINEAPPLE-42 | yes | 0 | 14,204 | 11,008 | 9 | 3,357 |
| fallback | r3 | PINEAPPLE-42 | yes | 0 | 14,198 | 11,008 | 9 | 3,876 |
| none | r1 | NONE | no | 0 | 14,139 | 11,008 | 5 | 3,543 |
| none | r2 | NONE | no | 0 | 14,137 | 11,008 | 5 | 3,229 |
| none | r3 | NONE | no | 0 | 14,137 | 11,008 | 5 | 3,310 |

### X02 두 파일 다, 폴백 있음

| arm | run | 답 | GRAPE-2 포함 | LEMON-1 포함 | 실행한 명령 | in | cached | out | wall |
|---|---|---|---|---|---|---|---|---|---|
| fallback | r1 | GRAPE-2 | yes | no | 0 | 14,195 | 13,056 | 8 | 3,487 |
| fallback | r2 | GRAPE-2 | yes | no | 0 | 14,198 | 13,056 | 8 | 3,459 |
| fallback | r3 | GRAPE-2 | yes | no | 0 | 14,198 | 11,008 | 8 | 4,617 |

### X03 중첩 `sub/CLAUDE.md`, `-C sub`, 폴백 있음

| arm | run | 답 | ROOT-5 포함 | SUB-6 포함 | 실행한 명령 | in | cached | out | wall |
|---|---|---|---|---|---|---|---|---|---|
| fallback | r1 | ROOT-5, SUB-6 | yes | yes | 0 | 14,206 | 11,008 | 11 | 3,421 |
| fallback | r2 | ROOT-5, SUB-6 | yes | yes | 0 | 14,209 | 11,008 | 11 | 3,571 |
| fallback | r3 | ROOT-5, SUB-6 | yes | yes | 0 | 14,209 | 13,056 | 11 | 3,706 |

### X04 `CLAUDE.md` 안의 `@rules.md`, 폴백 있음

| arm | run | 답 | IMPORT-8 포함 | 실행한 명령 | in | cached | out | wall |
|---|---|---|---|---|---|---|---|---|
| fallback | r1 | NONE | no | 0 | 14,196 | 11,008 | 5 | 3,412 |
| fallback | r2 | NONE | no | 0 | 14,196 | 13,056 | 5 | 3,486 |
| fallback | r3 | NONE | no | 0 | 14,193 | 13,056 | 5 | 4,407 |

## 지침 파일 — Claude (X05–X07)

### X05 `AGENTS.md`만, 도구 없음

| arm | run | 답 | MANGO-7 포함 | init tools | Read 대상 | 지시 파일 직접 읽음 | in | out | usd | wall |
|---|---|---|---|---|---|---|---|---|---|---|
| - | r1 | MANGO-7 | yes | [] | — | no | 6,757 | 151 | 0.0143 | 3,383 |
| - | r2 | MANGO-7 | yes | [] | — | no | 6,764 | 178 | 0.0144 | 3,561 |
| - | r3 | MANGO-7 | yes | [] | — | no | 6,754 | 111 | 0.0141 | 3,188 |

### X06 두 파일 다, 도구 없음

| arm | run | 답 | LEMON-1 포함 | GRAPE-2 포함 | init tools | Read 대상 | 지시 파일 직접 읽음 | in | out | usd | wall |
|---|---|---|---|---|---|---|---|---|---|---|---|
| - | r1 | LEMON-1 | yes | no | [] | — | no | 6,761 | 137 | 0.0142 | 3,279 |
| - | r2 | LEMON-1 | yes | no | [] | — | no | 6,755 | 127 | 0.0141 | 2,991 |
| - | r3 | LEMON-1 | yes | no | [] | — | no | 6,754 | 119 | 0.0141 | 2,980 |

### X07 중첩 파일, `--tools Read`

| arm | run | 답 | MANGO-7 포함 | KIWI-3 포함 | PLUM-9 포함 | init tools | Read 대상 | 지시 파일 직접 읽음 | in | out | usd | wall |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| nested-agents | r1 | MANGO-7, KIWI-3 | yes | yes | no | Read | pkg/data.txt | no | 18,844 | 396 | 0.0302 | 5,638 |
| nested-agents | r2 | MANGO-7, KIWI-3 | yes | yes | no | Read | pkg/data.txt | no | 18,906 | 382 | 0.0303 | 6,266 |
| nested-agents | r3 | MANGO-7, KIWI-3 | yes | yes | no | Read | pkg/data.txt | no | 18,928 | 596 | 0.0314 | 8,256 |
| nested-claude | r1 | MANGO-7, PLUM-9 | yes | no | yes | Read | lib/data.txt | no | 18,915 | 507 | 0.0309 | 6,346 |
| nested-claude | r2 | MANGO-7, PLUM-9 | yes | no | yes | Read | lib/data.txt | no | 18,882 | 613 | 0.0314 | 6,880 |
| nested-claude | r3 | MANGO-7 | yes | no | no | Read | lib/data.txt | no | 18,871 | 1,040 | 0.0335 | 11,156 |

## 구조화 출력 (X08–X09)

| probe | run | 스키마 적합 | verdict | findings | in | out | usd | turns | wall |
|---|---|---|---|---|---|---|---|---|---|
| X08 codex --output-schema | r1 | yes | pass | 0 | 43,056 | 156 | — | — | 11,389 |
| X08 codex --output-schema | r2 | yes | pass | 0 | 43,004 | 222 | — | — | 13,072 |
| X08 codex --output-schema | r3 | yes | pass | 0 | 28,555 | 95 | — | — | 10,359 |
| X09 claude --json-schema | r1 | yes | changes_requested | 1 | 200,089 | 986 | 0.4051 | 4 | 12,784 |
| X09 claude --json-schema | r2 | yes | changes_requested | 1 | 18,907 | 606 | 0.0309 | 3 | 7,735 |
| X09 claude --json-schema | r3 | yes | changes_requested | 1 | 18,910 | 625 | 0.0310 | 3 | 8,585 |

## 리뷰어 read-only (X10–X11)

| probe | arm | run | x.txt 생성 | 시도한 도구/명령 | 거부·변경 | 리뷰 스키마 적합 | usd / in | wall |
|---|---|---|---|---|---|---|---|---|
| X10 claude | isolated | r1 | no | Write,Read,Bash,Skill,Bash,Bash,Bash,Bash,Read,Bash,Bash,Bash,ReportFindings | Write,Bash | yes | 0.1403 | 60,382 |
| X10 claude | isolated | r2 | no | Write,Read,Bash,Skill,Bash,Bash,Bash,Bash,Read,Bash,Bash,ReportFindings,ReportFindings | Write,Bash,Bash | yes | 0.0876 | 52,229 |
| X10 claude | isolated | r3 | no | Write,Read,Bash,Skill,Bash,Bash,Bash,Read,Bash,Bash,Bash,Bash,ReportFindings,ReportFindings | Write,Bash | yes | 0.0999 | 60,085 |
| X10 claude | user | r1 | no | Write,Read,Skill,Bash,Bash,Bash,Glob,Read,Glob,Bash,Bash,ReportFindings,ReportFindings,Bash | Write,Bash,Bash | yes | 0.1735 | 61,582 |
| X10 claude | user | r2 | no | Write,Read,Bash,ReportFindings | Write,Bash | yes | 0.0667 | 25,580 |
| X10 claude | user | r3 | no | Read,Write,Bash,Skill,Bash,Bash,Bash,Glob,Read,Bash,Bash,Bash,Bash,ReportFindings | Write,Bash,Bash | yes | 0.1394 | 75,048 |
| X11 codex | isolated | r1 | no | /bin/zsh -lc "pwd && rg --files -g 'AGE…→0; /bin/zsh -lc 'printf hi > x.txt'→1; /bin/zsh -lc 'cat m.py'→0 | file_change=0 | yes | 43,693 | 17,877 |
| X11 codex | isolated | r2 | no | /bin/zsh -lc "pwd && rg --files -g 'm.p…→0; /bin/zsh -lc "cat m.py && printf 'hi' >…→1 | file_change=0 | yes | 43,269 | 17,900 |
| X11 codex | isolated | r3 | no | /bin/zsh -lc "pwd && rg --files -g 'm.p…→0; /bin/zsh -lc 'printf hi > x.txt'→1; /bin/zsh -lc 'nl -ba m.py'→0 | file_change=0 | yes | 57,952 | 20,589 |
| X11 codex | user | r1 | no | /bin/zsh -lc 'printf hi > x.txt'→1; /bin/zsh -lc "sed -n '1,240p' m.py"→0 | file_change=0 | yes | 43,569 | 35,516 |
| X11 codex | user | r2 | no | /bin/zsh -lc 'pwd && ls -la && printf h…→1; /bin/zsh -lc 'nl -ba m.py && git status…→0 | file_change=0 | yes | 43,728 | 31,650 |
| X11 codex | user | r3 | no | /bin/zsh -lc "pwd && rg --files -g 'm.p…→0; /bin/zsh -lc "printf 'hi' > x.txt"→1; /bin/zsh -lc 'nl -ba m.py && rg --files'→0 | file_change=0 | yes | 58,402 | 53,600 |

## transport 스모크 (X12, n=1)

| 단계 | exit | 결과 | 비고1 | 비고2 | in | out | usd | wall |
|---|---|---|---|---|---|---|---|---|
| worker (codex-bulk) | 0 | gate=pass | return 363 chars | main tree status lines=0 | 44,555 | 381 | — | 15,496 |
| phase diff | — | +5 lines | — | — | — | — | — | — |
| codex reviewer (sol) | 0 | schema ok | verdict=pass | findings=0 | 29,900 | 316 | — | 12,136 |
| claude reviewer (opus) | 0 | schema ok | verdict=pass | findings=0 | 44,953 | 222 | 0.2222 | 12,912 |

## Claude worker 형태 (X13)

| run | 편집 반영 | 시도한 도구 | 거부된 도구 | permissionMode | usd | wall |
|---|---|---|---|---|---|---|
| r1 | yes | Read,Bash,Edit | — | acceptEdits | 0.0364 | 10,684 |
| r2 | yes | Read,Bash,Edit | — | acceptEdits | 0.0368 | 11,421 |
| r3 | yes | Read,Bash,Edit | — | acceptEdits | 0.0365 | 11,033 |

## CLI 세부 동작 (X14–X17, n=1)

| probe | arm | 관측 | exit | wall |
|---|---|---|---|---|
| X14 `-o` + `-C` | absolute | found: abs-out.txt | 0 | — |
| X14 `-o` + `-C` | relative | found: rel/out.txt | 0 | — |
| X15 stdin | devnull | ok | — | 3,688 |
| X15 stdin | pipe-open | ok | — | 18,650 |
| X16 `--allowedTools` 순서 | prompt-first | (no stderr) | 0 | — |
| X16 `--allowedTools` 순서 | prompt-last | Error: Input must be provided either through stdin or as a … | 1 | — |
| X17 profile 형식 | file | model: gpt-6-sol | 1 | — |
| X17 profile 형식 | legacy | Error loading config.toml: --profile `cxc-review` cannot be… | 1 | — |

## mode 메모 비용 (X18)

Claude Code 2.1.283의 stream-json은 UserPromptSubmit 훅 이벤트를 내보내지 않는다(이 실험의 모든 run에서 0). 그래서 훅이 넣은
맥락은 **같은 프롬프트의 입력 토큰 차이**로 본다. 훅 출력 본문은 스트림에 없으므로 '메모 포함' 여부는 직접 관측할 수 없다.

| arm | run | UserPromptSubmit 훅 이벤트 수 | in | usd | wall |
|---|---|---|---|---|---|
| off | r1 | 0 | 6,592 | 0.0134 | 2,798 |
| off | r2 | 0 | 6,595 | 0.0134 | 2,622 |
| off | r3 | 0 | 6,595 | 0.0134 | 2,599 |
| on | r1 | 0 | 6,693 | 0.0136 | 2,694 |
| on | r2 | 0 | 6,693 | 0.0136 | 2,626 |
| on | r3 | 0 | 6,696 | 0.0136 | 2,786 |

입력 토큰: on [6693, 6693, 6696] · off [6592, 6595, 6595] · 중앙값 차 98 · 같은 arm 안 범위 on 3 / off 3

## 결정적 스위트와 정적 확인 (S01, O01)

- S01: `passed=53 failed=0`, exit 0
- O01: Orca `1.4.215` — help 발췌 10줄; `--model` 있음, `--effort` 있음, 권한 플래그 없음 문구 있음

## 합계

- Claude 호출 31회, CLI 보고 비용 합계 $1.86
- Codex 호출 30회, CLI 보고 토큰 합계(in+out) 754,951
