# precedent-lab / arrive-then-read-2.1.296 — analyze

표본(세션 jsonl·diff·훅 출력)은 **이 저장소에 없다** — 회사 소스가 들어 있어 로컬에만 두고 `specimens.sha256` 으로 무결성만 남긴다. 해석은 여기와 `../FINDINGS.md` 에만.

| 무엇 | 어디 | 쓰임 |
|---|---|---|
| 입력 명세 | `../SPEC.md` (1R) · `../r2/SPEC.md` · `../r3/SPEC.md` | 조건·작업·명령·판정 기준. 라운드마다 바뀐 것과 이유 |
| 1차 자동 판정 | `../analyze.py` → `../results.csv`, `../r2/analyze_r2.py` → `../r2/results.csv`, `../r3/analyze_r3.py` → `../r3/results.csv` | 훅 발화(세션 id 마커), 관할 읽기, 도착 호출·토큰, 위반 시그니처(답변 발췌 열은 제거) |
| 독립 판정 | `judgments-r1.md`·`.csv` (1R 41런), `../r3/judgments.md`·`.csv` (3R 42런 + 진단 2런) | 별도 에이전트가 diff 와 최종 답변을 읽고 분류. RECORDED 의 유효/합리화 구분은 3R |
| 지표 | `../METRICS.md` (1R), `../r2/METRICS.md`, `../r3/METRICS.md` ← `../make-metrics.py`, `../make-metrics-round.py` | 원지표·조건별 요약·델타·훅 상한 프로브 |
| 훅 상한 증거 | `../evidence/hook-cap/` (`probe.sh`, 결과 JSON, SUMMARY) | additionalContext 9,996자 전달 / 10,046자 누락 |
| Bash 읽기 훅 시제품 | `../r3/precedent-context-bash.sh`, `../r3/smoke_bash_hook.py` | 3R D arm. 레포 제안 1 |
| 이력 분석 | `../evidence/churn.md` `churn.json` | 창별 재수정률·일괄 수정·동반 갱신·Orca 기록 탐색 (읽기 전용 git log) |
| 발견 | `../FINDINGS.md` | 질문별 답 · F1~F8 · 효과 있던 것/없던 것 · 레포 제안 · 측정하지 않은 것 |
