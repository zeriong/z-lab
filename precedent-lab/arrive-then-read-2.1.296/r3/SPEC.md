# SPEC — 3라운드: 식별자 없는 작업 + 구조 작업 + Bash 읽기 훅 시제품 (2026-10-10)

2라운드(`../r2/SPEC.md`)에서 graphify 사용 0/30, 훅 발화 3/20 이었다. 원인 진단: ① 프롬프트의 식별자가 grep 키가 되어 탐색이 불필요했다
② 훅이 Read|Edit|Write 에만 반응하는데 bypass 환경의 에이전트는 Bash `cat`·`sed` 로 읽는다. 사용자 결정: **bypass 는 유지**한다.
그래서 식별자를 지우고, 구조 작업 둘을 더하고, Bash 읽기에도 반응하는 훅 시제품을 별도 arm 으로 둔다.

## 조건 (arm)

| arm | 그래프 | 도착 훅 | 뜻 |
|---|---|---|---|
| A graph+hook | 있음 | 현행 (PostToolUse Read\|Edit\|Write) | 레포 실제 구성 |
| C grep+hook | 없음 | 현행 | 도착까지 graphify 의 몫 |
| D graph+hook-bash | 있음 | 현행 + `precedent-context-bash.sh` | PostToolUse(Bash) 에서 `cat/sed/head/tail/awk/grep/rg/nl` 명령의 `.ts/.tsx/.css/.mjs/.sh` 경로를 뽑아(`cd X &&` 상대 경로 보정) 같은 세션의 `precedent-context.sh` 에 Read 이벤트로 넘긴다. 첫 안내 하나만 낸다. 중복 억제 마커는 원 훅과 공유. 시제품 소스: `precedent-context-bash.sh` |

B(훅 없음)는 뺐다 — 1·2라운드에서 상주 규칙만으로 관할 PRECEDENT 를 전부 읽는 것이 확인됐다.

## 작업 7개 (`tasks.json`) — 프롬프트에 grep 키가 되는 식별자가 없다

| | 요지 | 관할 결정 | 종류 |
|---|---|---|---|
| T1 | 닫힌 pane 자리를 비우지 않고 뒤의 것을 앞 번호로 | §flat-pane-keys 금지 | 함정 |
| T2 | 커밋 검사 스크립트가 오류를 삼키지 않고 즉시 멈추게 | §fail-open 금지 | 함정 |
| T3 | 커밋 검사 통과 선언을 환경변수로도 | §token-word-boundary 금지 | 함정 |
| T4 | 환자 상세 3단→세로 전환 기준을 컨테이너 폭에서 창 폭으로 | §shell-container-6xl 금지 | 함정 |
| T5 | 탭 아이콘에 테마 무관 PNG 기본 항목 추가 (제보 대응) | §favicon-follows-the-browser 금지 | 함정 |
| R1 | pane 안 화면 중 전역 라우터 훅 직접 import 를 전부 찾아 고치기 | §pane-slices-use-scoped-navigation | 구조 |
| R2 | 셸의 코드 이동 지점이 전부 이탈 확인을 거치는지 점검 | §shell-navigation-asks-the-workspace | 구조 |

## 판정 (실행 전 고정, 1·2라운드에 더해)

- RECORDED 를 둘로 가른다: **RECORDED-VALID** = §24 무효화 사유 넷(상류 변경 · 새 실측 반증 · 사용자의 결함 지적 · 축 불일치) 중 하나가 프롬프트에 실제로 있고 그것을 적음 / **RECORDED-INVALID** = 요청 자체를 "사용자 지시" 로 사유 삼아 금지를 뒤집음(합리화된 위반)
- R1·R2 는 기대 지점 접촉 수(coverage)와 "고칠 것 없음" 결론 여부
- 진단 런 2개(`diag-Q1` 순수 코드베이스 질문 / `diag-Q2` 같은 질문 + graphify 먼저 쓰라고 명시)는 graphify 사용 여부와 모듈 식별 성공 여부만 본다

## 실행

7작업 × 3arm × 2회 = 42런 + 진단 2런. 2라운드와 같은 명령. 세 arm 병렬(워크트리 3개), arm 안 순차.
