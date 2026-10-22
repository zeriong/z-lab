# FINDINGS — audit canary: `/context-rail:audit` (2026-10-22)

대상: `../build-canary-0.1.0/plugin/context-rail/` 사본, 합성 fixture 두 벌(정상본 = E4 정규화 결과물, 결함본 = 결함 3개를 심은 사본). Claude Code 2.1.308, `claude-opus-5-5`, effort `xhigh`, `--setting-sources project`.
4런(fixture 당 2), 실행 오류 0, 자가보고 비용 $1.41. 지표는 `METRICS.md`, 공개 기록은 `runs-public/`.

## SPEC 읽는 법에 따른 판정: **채택한다** (4/4 런이 판정 4항목 충족)

| 항목 | ok-r1 | ok-r2 | broken-r1 | broken-r2 |
|---|---|---|---|---|
| 읽기 전용(변경 0) | 충족 | 충족 | 충족 | 충족 |
| 검사 실행(5종 + 자산 비교) | 6/6 | 6/6 | 6/6 | 6/6 |
| 결함 3개 지목 | — | — | 3/3 | 3/3 |
| 거짓 결함 없음(사람이 읽음) | 충족 | 충족 | — | — |

## 발견

### U1 — `audit` 는 아무것도 바꾸지 않고 검사 다섯 가지와 자산 비교를 모두 돌렸다
- 4런 모두 끝난 뒤 작업 트리 변경은 0이었다.
- 4런 모두 `resident-size.py` · `install-hooks.py --check` · `--self-test` · `--max-output` · `records-lint.py` 를 실행했다. 설치된 훅과 플러그인 자산도 `diff`/`cmp` 로 비교했다.

### U2 — 심은 결함 세 개를 위치와 함께 짚었다
결함본 2런 모두 다음 셋을 줄 번호와 함께 보고했다.
- 어떤 파일도 가리키지 않는 `## gone.mjs` 헤딩(`src/tabs/PRECEDENT.md:10`)
- `- Decision:` 줄이 없는 블록(`:12`)
- 플러그인 자산과 다른 훅(덧붙인 주석 한 줄)

수정안은 제안만 하고 실행하지 않았다.

### U3 — 정상본에서 거짓 결함은 0이었다. 자동 휴리스틱은 부정문에 걸렸다
- 정상본 2런은 「Proposed fixes: none」으로 끝났다.
- 사전 등록한 자동 문자열 지표(`named`)는 정상본에서도 일부 참이 됐다. 「No decision blocks missing their decision line」「`diff` found no difference」 같은 부정문에 정규식이 걸린 것이다.
- SPEC 은 이 항목을 사람이 읽어 판정하도록 정했다. 판정은 사람이 읽은 값이다.

### U4 — 훅이 자산과 다르면 `install-hooks.py --check` 가 배선 보고 없이 종료 코드 2로 멈춘다
- broken-r1 은 이 상황을 보고했고, `settings.json` 을 설치기의 기대값과 직접 대조해 배선이 맞다고 확인했다.
- 「배선 확인」과 「훅 내용 차이」가 한 검사에 묶여 있어서 생기는 일이다. 개선 후보로 backlog 에 둔다(`../analyze/improvement-backlog.md`). 스킬을 바꾸려면 다시 재야 한다.

## 측정하지 않은 것

- 다른 결함 유형: `paths:` 가 빠진 경로 규칙, 배선 누락, 상주 문서의 순증.
- Codex, 다른 모델·effort, 대화형 세션. 각 fixture 2런이다.
