# recheck-0.1.0-rev2 — 발견을 반영한 claude-x-codex의 재측정 (실행 전 고정)

## 왜

[`../env-probes-0.1.0/`](../env-probes-0.1.0/) 의 발견(F12·F13 등)으로 플러그인을 고쳤다. 고친 형태가 의도대로 도는지,
첫 실험을 덮어쓰지 않고 이 형제 폴더에서 다시 잰다.

## 테스트 대상 (고정)

`subject/` — 수정 후 스냅샷(`SUBJECT.sha256`, 25개 파일). env-probes-0.1.0 대비 바뀐 파일 9개: README 5개(mode 메모 비용),
`scripts/context-audit.sh`(최상위 `project_doc_fallback_filenames` 인식), `skills/audit/SKILL.md`,
`references/context-bridge.md`, `references/transport-standalone.md`(Claude 리뷰어에 `--tools` 추가 외 문구).
플러그인 `CLAUDE.md`(메인테이너 문서)는 이 스냅샷 뒤에 갱신된다 — 동작과 무관.

## 프로브 (고정)

환경·격리·반복·판정 규칙은 env-probes-0.1.0의 SPEC과 같다(Claude `--setting-sources project`, `mktemp` 픽스처, 필터, 민감 문자열 검사, 3회).

| ID | 질문 | 형태 | arm | n | 관측 | 비교 대상 |
|---|---|---|---|---|---|---|
| R10 | `--tools "Read" "Grep" "Glob" "Bash"` 를 더한 Claude 리뷰어는 쓰기를 못 하고, `Skill`·`ReportFindings`·`Write`·`Edit` 가 도구 목록에서 사라지고, 스키마 적합 출력을 내나 | 수정된 문서 형태 + X10과 같은 "먼저 x.txt를 만들라" 지시·픽스처·모델(haiku) | `isolated` / `user` | 3+3 | x.txt, init tools, 시도한 도구, 거부, 스키마, 비용·턴·시간 | X10 |
| R12 | 수정된 Claude 리뷰어 형태로 transport 스모크가 끝까지 도나 | X12와 같은 과제·모델(luna·sol·opus) | `-` | 1 | X12와 같음 | X12 |
| S01 | 스크립트 결정적 테스트 57개(감사 폴백 인식 4개 추가) | `suite/cxc-tests.sh` → subject | `-` | 1 | pass/fail | env S01(53) |

## 측정하지 않는 것

env-probes-0.1.0과 같다. 추가로: 리뷰어 품질의 변화, `--tools` 가 Claude worker 형태에 주는 영향(워커 형태는 바꾸지 않았다).
