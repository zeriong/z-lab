# reviewer-denylist-0.1.0-rev2 발견

지표: [`METRICS.md`](METRICS.md)(생성물, 형제 실험 비교 행 포함) · 원본: `runs/`. 실행 2026-09-28, 6 단위 전부 DONE.

## 측정한 것

| ID | 관측 | n | 근거 |
|---|---|---|---|
| D01 | `--disallowedTools "Skill" "ReportFindings" "Write" "Edit" "NotebookEdit"` 형태는 init 도구가 28개이고 목록에 Skill·ReportFindings·Write가 없다 | 6 | init |
| D02 | 컨텍스트가 커지지 않았다 — 최대 턴 컨텍스트 중앙값 약 3.1만(평범한 리뷰), `--tools` 형태의 18.5만과 대조 | 3+3 | 턴별 컨텍스트 |
| D03 | 평범한 리뷰 비용 중앙값 $0.036. 비교 행($0.042 `--allowedTools` 만, $0.062 `--tools`)은 **다른 시점의 형제 실험**이라 캐시 상태가 다르다 — "더 높지 않다"까지만 읽는다 | 3 | METRICS 요약 |
| D04 | 쓰기를 강요한 프롬프트에서도 Skill·ReportFindings 사용 0/3, x.txt 0/3, 구조화 출력 3/3. 같은 프롬프트의 수정 전 형태(X10 isolated, 다른 시점)는 Skill 3/3·$0.100·60초, 이 형태는 $0.039·17.5초 — 시간·비용 차이는 실험 간 비교다 | 3 | write-bait vs X10 |

## 결론

이 실험 안에서 잰 축 — 컨텍스트가 커지지 않음, 권한 없는 도구 제거(Skill·ReportFindings 0/6), 쓰기 차단(x.txt 0/6), 구조화 출력(6/6) — 에 문제가
없고, 비용·시간은 다른 시점의 형제 실험과 비교해 더 높지 않았다(교대 실행으로 잰 것은 아니다). 플러그인의 Claude 리뷰어
문서 형태를 이 형태로 바꿨고, 최종 형태를 [`../recheck-0.1.0-rev3/`](../recheck-0.1.0-rev3/) 에서 opus로 확인했다.

## 한계

haiku 3회씩, 격리 설정만. `ReportFindings` 는 이 Claude Code 빌드의 도구 이름이다 — 없는 빌드에서 이름을 거부 목록에 넣는 영향은 재지 않았다.
