# split-1.6.0 — 실제 plan-writer가 큰 플랜을 손실 없이 나누나 (실행 전 고정)

## 질문

plan-smith 1.6.0은 20,000자를 넘는 최종 플랜을 인덱스와 순서 있는 파트로 나눈다(Stage 2d). 분할은 새 `plan-writer`
인스턴스가 규약(`references/split.md` 의 "Split protocol")을 받아 텍스트를 **옮기기만** 하고, `scripts/split-check.py` 가
무손실·형식을 검사한다. 이 실험은 **실제 에이전트 정의로** 그 절차를 돌려, 검사를 통과하는지, 몇 번 만에 통과하는지,
파트가 어떤 크기로 나오는지, 비용이 얼마인지 잰다.

**재지 않는 것:** 분할이 구현자의 맥락 누락을 줄이는지(가설) — 그것은 별도의 A/B가 필요하다.

## 테스트 대상 (고정)

`subject/plugins/plan-smith/` — because-i-needed `feat/plan-smith-split`(base `3969269`) 작업 트리의 스냅샷, `SUBJECT.sha256` 15개 파일.

## 입력 (고정)

`inputs/` 의 플랜 3개 — [`inputs/SOURCES.md`](inputs/SOURCES.md). 기존 표본의 복사본이며 내용을 바꾸지 않았다.

## 절차 (고정 — split.md의 Procedure를 그대로 따른다)

run마다 새 `mktemp` 픽스처 `plans/<id>/plan.md` 에 입력을 두고:

1. `mv plan.md plan.unsplit.md`
2. 집필자 호출: `claude -p <prompt> --agent plan-smith:plan-writer --plugin-dir subject/plugins/plan-smith
   --setting-sources project --permission-mode acceptEdits --model opus --output-format stream-json --verbose`.
   prompt = 세 개의 절대 경로(unsplit 입력, index 출력, parts 디렉터리) + split.md의 "Split protocol (copy verbatim to the
   writer)" 절 원문. `--agent` 는 `plan-writer` 정의(도구 Read·Glob·Grep·Write, `model: inherit`)를 그대로 쓴다 — 스킬의
   Task 호출과 같은 정의·새 컨텍스트이며, 메인 에이전트가 끼지 않는다.
3. `python3 subject/plugins/plan-smith/scripts/split-check.py plans/<id>`
4. 실패하면 **한 번** 다시 호출한다(프롬프트 끝에 검사기 출력을 붙인다). 그래도 실패하면 실패로 기록한다.

입력마다 2회(`r1`, `r2`), 총 6 run. 상태 인지(z-lab 제6조): `runs/<id>/r<k>/DONE` 이 있으면 건너뛴다.

## 관측

run별: 시도 횟수와 각 시도의 검사 결과, 파트 수·코드, 파트별 문자 수(10,000자 목표 대비), 인덱스의 "holds no implementation"
문장 유무, 첫 파트·마지막 파트 이름, CLI 보고 비용·턴·시간, 러너가 잰 벽시계. 산출물(인덱스·파트·unsplit)은 `runs/` 에 그대로 남긴다.
stream-json은 `filter_stream.py` 를 거쳐 저장하고 민감 문자열 검사를 통과해야 DONE이 된다.

## 측정하지 않는 것

분할이 구현 결과에 주는 영향, 메인 에이전트가 끼는 전체 파이프라인(Stage 1–3), opus 외 모델, 리뷰 품질.
