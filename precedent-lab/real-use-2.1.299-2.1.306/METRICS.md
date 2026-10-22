# METRICS — real-use (생성: analyze.py)

기간: 2026-10-16T02:45:14Z ~ 2026-10-22T07:30:00Z (transcript 첫 레코드 시각 기준). 분석 세션과 그 서브에이전트는 제외.

## A. 모집단

- transcript: 최상위 13 · 서브에이전트 453
- entrypoint: {'cli': 454, 'sdk-cli': 12}
- CLI version: {'2.1.305': 148, '2.1.301': 135, '2.1.302': 78, '2.1.299': 59, '2.1.306': 34, '2.1.300': 12}

## B. 도착 주입 (PostToolUse · PostToolUseFailure)

| 항목 | 건수 |
|---|---:|
| full | 1424 |
| compressed | 245 |
| noline | 479 |
| edit-reminder | 45 |
| rules-hint | 5 |
| stop | 1673 |
| persisted | 0 |
| event:PostToolUse | 2167 |
| event:PostToolUseFailure | 31 |
| 주입이 1건 이상인 transcript | 373 |
| 본문·압축 주입 글자 수 중앙 / 최대 | 1810 / 6163 |

## C. 확인 문구 뒤 (기계 지표, 판정 아님)

| 항목 | 건수 |
|---|---:|
| C1-target-edited-after | 16 |
| C2-precedent-edited-after | 109 |
| C3-ask-candidate-after | 90 |
| trigger:Bash | 1115 |
| trigger:Edit | 7 |
| trigger:Read | 551 |
| with-target | 558 |

## D. 커밋 토큰

| 항목 | 건수 |
|---|---:|
| commit-commands | 1 |
| with-PRECEDENT_OK | 1 |
| denied | 0 |
| denied-needing-PRECEDENT_OK | 0 |
| after-precedent-denial:next-commits | 0 |
| after-precedent-denial:next-has-token | 0 |

## E. 이력 (dev, --no-merges, author date)

| 창 | 기간 | 소스 커밋 | PRECEDENT.md 동반 | 건드린 소스 파일 | 3회 이상 | 재수정률 |
|---|---|---:|---:|---:|---:|---:|
| pre | 2026-10-09~2026-10-16 | 26 | 26 | 180 | 2 | 1.1% |
| post | 2026-10-16~2026-10-22 | 26 | 23 | 202 | 0 | 0.0% |
