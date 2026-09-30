# 하네스 생성 및 검증 보고

상태: 산출물 준비 및 검증 완료, 루트 설치 차단. 전체 설치 완료로 선언하지 않는다.

사용자 요청에서 단일 gate 규칙 no-literal-todo(P2)를 도출했다. 출처 request.txt:1, 실제 준수 사례 src/greet.js:1. 추가 규칙/advisory 없음.
번들 references/workflow.md의 11단계를 Codex 경로에 맞추었고 assets/inject-context.sh는 바이트 단위로 동일하게 복사하여 실행 비트를 부여했다.

## 실제 생성 경로
다음 경로의 공통 접두사는 `docs/harness-build/generated/`이다. 루트에 설치되지는 않았다.

- `.agents/skills/harness-engineering/SKILL.md`
- `.agents/skills/project-rules/SKILL.md`
- `.agents/skills/project-rules/references/no-literal-todo.md`
- `.codex/hooks/inject-context.sh`
- `.codex/hooks.json`
- `.codex/scripts/review-gate.sh`
- `docs/conventions/no-literal-todo.md`

## 실제 검증
- validation.json: 별도 임시 픽스처에서 34건 통과. 정상 게이트 exit 0, 고의 위반 exit 1, 잘못된 인자/환경 오류 exit 2.
- 정상 훅의 두 스킬 본문 주입, 6가지 우회 입력, 하위 디렉터리 실행 및 hooks.json 선언 명령의 직접 호출 통과.
- 미추적 파일, 공백/개행 파일명, .js/.mjs/.cjs/.jsx, 바이너리 바이트, 심볼릭 링크와 순환 처리 검사.
- target-checks.json: 실제 원본 픽스처의 npm run lint 및 npm run typecheck 모두 exit 0. 둘 다 node --check 구문 검사이며 의미적 타입 검사가 아니다.
- 원본 src/greet.js, package.json, AGENTS.md, request.txt의 SHA-256 일치. 패키지 설치, stage, commit, push, 사용자 설정/플러그인 소스 수정 없음.
- 초기 검증 스크립트는 [] 입력에 무출력을 잘못 기대했다. 번들 소스를 재확인하여 빈 프롬프트 주입이 의도된 동작임을 확인하고 테스트 기대만 수정했다. 생성 산출물은 수정하지 않았다.

## 독립 리뷰 및 종합
- /root/rule_review_fresh: 규칙 도출/구조, 품질 평균 4.50/5.
- /root/gate_review_fresh: 게이트/구현, 품질 평균 4.33/5.
- 각각 새 독립 Codex 에이전트에 같은 전체 입력 번들을 제공하고 읽기 전용으로 수행했다. 사실 근거 누락 0, 게이트 회피 0, 수정 제안 0. 추가 패치 불필요.
- 모델/추론 강도는 메인 세션 상속. 계정의 확인된 설정은 gpt-6-astra/xhigh이다. 에이전트 도구는 실제 런타임 모델 식별자를 노출하지 않아 별도 확인했다고 주장하지 않는다. Opus/Sonnet 리뷰가 아니다.
- 최초 기록 복제 spawn은 세션 저장소 오류, CLI 대체 두 실행은 권한 오류로 실패했다. 이후 fork_turns=none 독립 두 리뷰가 실제 완료되었다. 실패 로그와 최종 리뷰 JSON 모두 보관했다.
- 근거: review-rule.json, review-gate.json, review-summary.json, review-input.md.

## 별도 미완료 사항
1. 루트 설치: 파일시스템 정책상 .codex 및 .agents 생성이 Operation not permitted로 거부되었다. 쓰기 허용 환경에서 준비된 파일을 해당 루트 경로에 설치해야 한다. 기존 hooks.json이 있으면 관련 없는 키/훅을 유지하고 동일 명령 중복 없이 병합한다. AGENTS.md는 보존한다.
2. 런타임 훅 신뢰: 설치 후 Codex에서 프로젝트와 정확한 훅 정의의 신뢰 및 훅 활성화를 확인해야 한다. 현재 대기이며 직접 스크립트 실행은 자동 런타임 호출 증거가 아니다.

검증 재실행: `python3 docs/harness-build/verify.py` (별도 폐기 가능한 임시 픽스처만 수정).
