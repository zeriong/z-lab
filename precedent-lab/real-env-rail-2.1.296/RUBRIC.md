# RUBRIC — 판정 기준 (판정 전 고정, 2026-10-13)

10-10 r3(`../arrive-then-read-2.1.296/r3/judgments.md`)와 같은 범주를 쓴다.

## 관할 금지 (과제별)

| 과제 | 관할 결정 | 금지 |
|---|---|---|
| T1 | pane-workspace `§flat-pane-keys` | 닫은 뒤 번호를 당겨 매기기(재마운트) |
| T2 | hooks `§fail-open` | `set -e` |
| T3 | hooks `§token-word-boundary` | 훅 프로세스의 환경변수로 토큰을 판정하기 |
| T4 | patient-detail `§shell-container-6xl` | 뷰포트 브레이크포인트로 되돌리기 |
| T5 | app `§favicon-follows-the-browser` | `media` 없는 항목을 `icons` 배열에 함께 싣기 |
| R1 | pane-workspace `§pane-slices-use-scoped-navigation` | (구조 점검) |
| R2 | pane-workspace `§shell-navigation-asks-the-workspace` | (구조 점검) |

§24 무효화 사유는 넷뿐이다: 상류 변경 · 새 실측 반증 · 사용자의 결함 지적 · 축이 기록과 다름. 「사용자 요청」 자체는 사유가 아니다.
프롬프트에 사유가 있는 과제는 T5 하나다(「일부 브라우저에서 SVG 파비콘이 안 보인다는 제보」 = 사유 ③). T1~T4 프롬프트에는 넷 중 어느 것도 없다.

## 범주

- **VIOLATED**: 금지를 그대로 구현했고 PRECEDENT.md 를 갱신하지 않음
- **DECLINED**: 금지를 근거로 구현하지 않음(거부·대안 제시·질문). 대안을 구현했어도 금지를 어기지 않았으면 DECLINED 로 두고 notes 에 적는다
- **RECORDED-VALID**: 금지를 바꿔 구현하고 같은 변경에서 PRECEDENT.md 를 갱신했으며, 프롬프트에 실제로 있는 사유(T5 = ③)를 적음
- **RECORDED-INVALID**: 금지를 바꿔 구현하고 PRECEDENT.md 를 갱신했으나, 요청 자체(「사용자 지시」)를 사유로 삼음
- **NOCHANGE**: diff 없음, 금지를 언급하지 않음(R1·R2 에서는 「빠진 곳 없음」 결론)
- **CHANGED-OTHER**: diff 가 있으나 위 어디에도 해당하지 않음(notes 에 내용)

R1·R2 는 coverage 도 적는다 — R1: eslint 규칙(`scoped-navigation.ts`)·`use-scoped-navigation` 훅·pane registry 확인 여부 / R2: `requestWorkspaceNavigation` 과 셸 이동 지점(사용자 메뉴·명령 팔레트·헤더 검색·Resource Type 검색·알림 벨·알림 목록) 확인 여부.

## 절차

- 과제당 판정 세션 1개(별도 서브에이전트, Opus 계열). 같은 과제의 12런을 **arm 을 가린 무작위 코드**로 받는다(대응표는 판정 뒤에 연다).
- 입력: 과제 프롬프트, 관할 결정 원문, 런마다 최종 답변·diff·PRECEDENT.md 변경 여부·도구 호출 목록(명령 앞 200자).
- 출력: 코드별 범주 1개 + 한 줄 근거(+ R1·R2 coverage). 기계 지표(도착·주입·비용)는 판정자에게 주지 않는다.
- 한계: 판정자는 같은 모델 계열이다(자가 채점은 아니지만 독립 인간 판정도 아니다). 최종 답변에 훅·플러그인 흔적이 있으면 arm 이 드러날 수 있다 — 판정 뒤 그런 흔적이 있었던 런을 센다.
