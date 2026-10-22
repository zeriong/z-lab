# SPEC — audit canary: `/context-rail:audit` 가 읽기만 하며 결함을 짚는가 (2026-10-22 고정)

실행 시작 전에 고정한다. 바꾸면 새 라운드다(제3조).
`build` 는 E4 에서 쟀지만 `audit` 스킬은 에이전트로 돌려 본 기록이 없다. because-i-needed Rule 9 는 스킬을 실제 정의로 돌려 보라고 요구한다.

## 고정 조건

- **플러그인**: `../build-canary-0.1.0/plugin/context-rail/`(E4·E5 와 같은 사본, `plugin.sha256`).
- **fixture**(회사 코드 없음)
  - `fixture-ok/` = `../fresh-project-0.1.0/fixture-N/` 그대로(E4 가 정규화한 결과물).
  - `fixture-broken/` = 같은 것에 결함 3개를 심었다.
    - ① `src/tabs/PRECEDENT.md` 에 어떤 파일도 가리키지 않는 `## gone.mjs` 고아 헤딩
    - ② 그 아래 `- Decision:` 줄이 없는 블록 `§orphan-note`
    - ③ 설치된 훅 끝에 한 줄을 덧붙여 플러그인 자산과 다르게 만듦
  - 사전 점검: `records-lint.py` 가 ①②를 잡고, `cmp` 가 ③을 잡는다. 정상본은 셋 다 없다.
- **실행**: `claude -p "/context-rail:audit" --plugin-dir <사본> --model opus --effort xhigh --setting-sources project --permission-mode bypassPermissions --output-format stream-json --verbose --max-turns 60 --max-budget-usd 5`, 타임아웃 1800초. fixture 당 2런, 모두 4런.
- CLI 버전은 런마다 init 에서 적는다.

## 판정 (실행 전 고정)

- **읽기 전용**: 실행 뒤 `git status --porcelain --untracked-files=all` 이 비어 있어야 한다.
- **검사 실행**: Bash 명령에 다음이 모두 나와야 한다.
  - `resident-size.py`
  - `install-hooks.py … --check`
  - `--self-test`
  - `--max-output`
  - `records-lint.py`
  - 설치된 훅과 플러그인 자산의 비교(`cmp`·`diff`·해시 중 하나)
- **결함 지목**(broken): 최종 답변이 ①(`gone.mjs`), ②(`orphan-note` 또는 decision 줄 없음), ③(자산과 다름)을 모두 짚는다.
- **거짓 결함 없음**(ok): 최종 답변이 결함을 보고하지 않는다. 사람이 읽어 판정하고, 그렇게 적는다.

## 읽는 법

- 4런 모두가 판정 4항목을 만족하면 `audit` 를 채택한다.
- 하나라도 어기면 채택하지 않는다. 이때 SKILL.md 를 고치고 새 라운드로 다시 잰다.

## 측정하지 않는 것

- 다른 결함 유형(경로 규칙의 `paths:` 누락, 배선 누락), Codex, 다른 모델·effort, 대화형 세션.
