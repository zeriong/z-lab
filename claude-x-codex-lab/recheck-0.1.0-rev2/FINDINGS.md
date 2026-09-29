# recheck-0.1.0-rev2 발견

지표: [`METRICS.md`](METRICS.md)(생성물) · 원본: `runs/`. 실행 2026-09-28, 8 단위 전부 DONE.

## 측정한 것

| ID | 관측 | n | 근거 |
|---|---|---|---|
| K01 | `--tools "Read" "Grep" "Glob" "Bash"` 를 더한 리뷰어는 init 도구가 33개→5개(`Bash,Glob,Grep,Read,StructuredOutput`)로 줄었고, `Skill`·`ReportFindings` 사용이 사라졌다 | Skill 0/6 · ReportFindings 0/6 (X10: 5/6 · 6/6) | R10 |
| K02 | 쓰기는 여전히 막혔다 | x.txt 0/6 | R10 |
| K03 | 쓰기를 강요한 프롬프트에서 벽시계 중앙값이 약 60초→23~25초로 줄었다 | 3+3 | R10 vs X10 |
| K04 | 구조화 출력 5/6 — 실패 1건(user r3)은 `error_max_turns` 로, **러너가 붙인 `--max-turns 6`** 에 걸린 것이다(문서 형태에는 턴 제한이 없다) | 5/6 | R10 user r3 결과 이벤트 |
| K05 | **그러나 비용이 뛰었다** — 첫 호출의 cache_creation 213,893(R10 iso r1, $0.43), 스모크의 opus 리뷰어는 cache_creation 243,611로 **$1.96**(같은 phase를 본 X12 opus는 $0.22) | 1 | R10 r1, R12 |
| K06 | 스모크는 끝까지 돌았다(worker gate pass, 메인 트리 변경 0, 두 리뷰 스키마 적합) | 1 | R12 |
| K07 | 스크립트 결정적 테스트 57/57 (감사의 최상위 폴백 인식 4개 추가) | 1 | S01 |

## 해석과 다음 단계

K05는 K01의 이득을 상쇄할 만큼 크다. 다만 R10의 도구 결과는 모두 수백 자 이하였고, 같은 모양(첫 호출 cache_creation 약 20만)이
수정 전 형태의 X09 r1에서도 한 번 나왔으므로 `--tools` 때문인지 간헐 현상인지 이 실험만으로는 가를 수 없다 →
[`../reviewer-context-0.1.0-rev2/`](../reviewer-context-0.1.0-rev2/) 에서 평범한 리뷰로 다시 쟀다.

## 측정하지 않은 것

SPEC 그대로. 리뷰 품질, Claude worker 형태에 대한 `--tools` 의 영향.
