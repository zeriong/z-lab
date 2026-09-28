# claude-x-codex-lab / analyze

표본(각 실험의 `runs/`)과 분리된 해석만 둔다(z-lab 제9조).

| 파일 | 내용 |
|---|---|
| [`improvement-backlog.md`](improvement-backlog.md) | 관측 → 진단 → 제안, 그리고 플러그인에 반영했는지. 항목마다 근거 실험과 발견 ID |
| [`USAGE.md`](USAGE.md) · [`usage.py`](usage.py) | 두 계열 모든 실험의 모델 호출 수·토큰·비용(CLI 자가보고), 스크립트로 생성 |
| [`plugin-state-8b.sha256`](plugin-state-8b.sha256) | 8a·8b 반영 후 플러그인 파일 목록과 해시 — 마지막 측정 스냅샷(rev3) 이후 상태의 기준 |

## 실험 계열의 흐름 (2026-09-28)

| 순서 | 실험 | 대상 | 한 줄 |
|---|---|---|---|
| 1 | [`env-probes-0.1.0`](../env-probes-0.1.0/) | 초안 스냅샷 | 스킬이 기대는 CLI 동작 20개 프로브, 65 단위. 대부분 확인, 문서와 다른 점 5가지(F12·F13·F16·F17 등) |
| 2 | [`recheck-0.1.0-rev2`](../recheck-0.1.0-rev2/) | 1차 수정 | `--tools` 화이트리스트 리뷰어 — 도구는 줄었지만 첫 호출 비용이 뜀(K05) |
| 3 | [`reviewer-context-0.1.0-rev2`](../reviewer-context-0.1.0-rev2/) | 같음 | 평범한 리뷰에서도 `--tools` 가 컨텍스트 6배·비용 1.5배(C01·C02) |
| 4 | [`reviewer-denylist-0.1.0-rev2`](../reviewer-denylist-0.1.0-rev2/) | 같음 | `--disallowedTools` 거부 목록이 모든 축에서 최선(D01–D04) |
| 5 | [`recheck-0.1.0-rev3`](../recheck-0.1.0-rev3/) | 최종 | 거부 목록 형태를 opus로 확인, 비용이 수정 전 수준(L01·L02) |
| 6 | [`effort-flags-0.1.0`](../effort-flags-0.1.0/) | — | 사용자 결정(리뷰 Opus·sol `xhigh`, 워커 `high`)을 적기 전 두 CLI의 effort 인자 확인(E1–E6) |

## 사용자 결정 (측정이 아닌 방침)

| 결정 | 근거·기록 |
|---|---|
| 상호 리뷰는 Claude Opus·Codex `gpt-6-sol`, 둘 다 `xhigh`; 워커는 `high` | 값을 적기 전 CLI 확인: [`effort-flags-0.1.0`](../effort-flags-0.1.0/) (E1–E6) · backlog 8a |
| 고위험 단계라도 최상위 모델·`max` 는 쓰기 전에 먼저 묻는다(Claude Code는 AskUserQuestion) | 측정 없음(비용·통제 결정) · backlog 8b |

두 결정은 문서 변경이다. rev3 이후 다시 잰 것은 E03(Claude `--effort` 조합 3회)뿐이고, Codex를 `xhigh`·`high` 로 실제 실행한 기록은 없다
(사용자의 Codex 계정 확인 전, E02는 인증 없는 헤더 확인).

Claude Code 플러그인 시스템 자체의 사실(훅 자동 로드, 이름 변경, `disable-model-invocation`)은
[`../../plugin-platform-lab/`](../../plugin-platform-lab/) 에 있다.
