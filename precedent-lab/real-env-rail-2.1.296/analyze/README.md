# analyze — real-env-rail 인덱스

| 파일 | 무엇 | 언제 쓰나 |
|---|---|---|
| `../SPEC.md` | 입력 명세(실행 전 고정, 커밋 `c324e9a`) | arm 정의·지표 정의를 확인할 때 |
| `../RUBRIC.md` | 판정 기준(판정 전 고정) | 판정 범주를 확인할 때 |
| `../RUNLOG.md` | 오케스트레이터 개입·실행 사건 | 재실행·버그·오염 사실을 확인할 때 |
| `../METRICS.md` | P0 상주 분해 · arm 별 비용 · 사슬 · 부작용 · 판정 매트릭스(자동 생성) | 숫자를 인용할 때 |
| `../FINDINGS.md` | 발견 · 효과 표 · 측정하지 않은 것 | 결론을 인용할 때 |
| `../results.csv` | 런별 기계 지표(도구 순서·도착·주입·비용) | 재집계 |
| `../judgments.csv` | 런별 판정 범주(메모·인용은 회사 소스가 섞여 로컬에만) | 재집계 |
| `../x-isolate/` | 금지 깸 급증의 원인 분리(project / +effort / +language) | F4 의 근거 |
| `../evidence/graphify-probe.md` | graphify 결정론 probe(모델 없음) | F6 의 근거 |
| `../hooks/precedent-inject.py` | 도착 시 절 본문 주입 훅 시제품 | 레포에 옮길 때의 원본 |
| `improvement-backlog.md` | 관측 → 진단 → 제안 | 다음 실험·레포 변경을 고를 때 |

표본(트랜스크립트·diff·판정 패킷·판정 메모 원문)은 회사 소스를 담고 있어 `~/.cache/precedent-lab/real-env-rail/` 에만 있다. 세션 트랜스크립트는 약 30일 뒤 지워지므로, 지표는 실행 직후 `results.csv`·`METRICS.md` 로 옮겨 두었다.
