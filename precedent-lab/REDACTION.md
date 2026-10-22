# REDACTION — precedent-lab 회사 식별자 치환 (2026-10-22)

대상은 `*-2.1.296/` 실험 5편이다. `platform-*` 은 만들 때 이미 치환했다(각 폴더의 `REDACTION.md`).
이 계열은 비공개 레포에서 쟀다. 표본은 처음부터 이 저장소에 두지 않았지만, 명세·판정·스크립트·이력 분석에 그 레포의 식별자가 남아 있었다.

## 결정

- 2026-10-22 관리자 결정에 따라 **새 커밋으로 덮었다**. 이력 재작성과 force-push 는 하지 않았다(z-lab 제8조).
- 그래서 이 커밋 **이전** 이력에는 원래 식별자가 그대로 있다. 관리자가 이를 감수했다.
- 이것은 공개용 치환이다. 실험 조건을 바꾼 것이 아니므로 제3조의 「명세 수정 = 새 실험」에 해당하지 않는다. 숫자·판정·결론은 한 글자도 바꾸지 않았다.

## 치환한 것

같은 원래 값은 모든 파일에서 같은 자리표시자로 바꿨다. 그래서 파일 사이의 교차 참조는 그대로 읽힌다. 대응표는 저장소에 두지 않는다.

| 범주 | 자리표시자 |
|---|---|
| 레포 이름, 로컬 절대경로 | `REDACTED-repo`, `/path/to/REDACTED-repo` |
| 앱 이름(경로 포함) | `REDACTED-app`, `apps/REDACTED-app` |
| 회사 이름 | `REDACTED-company` |
| 실험 기준 커밋, 그 밖의 커밋 SHA | `REDACTED-commit`, `REDACTED-commit-NN` |
| 제품 소스 파일명 | `REDACTED-file-NN.<확장자>` |
| 제품 디렉터리(화면·슬라이스) 이름 | `REDACTED-dir-NN` |
| 결정 슬러그 | `REDACTED-slug-NN` |
| 제품 코드 심볼 | `REDACTED_symbol_NN` |

## 삭제한 것

- `arrive-then-read-2.1.296/evidence/churn.json`: 원시 커밋·파일 목록이다.
- `arrive-then-read-2.1.296/evidence/churn.md` 의 표 4·5·9: 파일별 수정 횟수, 일괄 수정 커밋 목록, `PRECEDENT_OK` 후보 커밋 목록이다. 이 표들의 요약 문장과 나머지 집계표(표 1–3·6–8)는 남겼다.

## 일부러 남긴 것

- **하네스와 방법론 이름**: `commit-gate.sh`·`precedent-context.sh`·`inject-context.sh`·`critical-core.md`·`precedent-md.md`·`style.md`·`project-rules`·`ci-gate`·`pass-ledger.md`·`fail-open`·`arrive-then-read`. 실험이 다루는 구조 자체이고, 공개 글과 공개 플러그인(`harness`)에도 나오는 이름이다.
- **호스트 정보**(로컬 경로, 사용자명): because-i-needed Rule 9 와 이 저장소의 결정(2026-09-30)에 따라 마스킹 대상이 아니다.
- **과제 프롬프트의 서술과, 시험 대상 금지 줄의 짧은 인용**: 실험을 읽으려면 필요하다. 식별자는 위 표대로 치환했다.

## 따라오는 결과

- 스크립트(`setup_condition.sh`·`strict_chain.py`·`make_judge_packets.py` 등)는 경로·슬러그가 바뀌어 원래 레포를 대상으로 그대로 돌지 않는다. 원래부터 비공개 레포 없이는 돌지 않는 스크립트였다.
- `specimens.sha256` 과 표본은 바꾸지 않았다.

## 확인 방법

- 비공개 레포에서 다음 후보를 뽑았다.
  - 추적 파일의 경로 구성 요소(디렉터리·파일명)
  - `PRECEDENT.md` 의 `§slug` 701개
  - export 심볼(8자 이상)
  - 레포에 실제로 존재하는 커밋 SHA
- 이 후보로 계열의 추적 파일 전부를 대조했다. 위 「일부러 남긴 것」 외의 남은 출현은 0이다.
- 치환한 `.py`·`.sh`·`.json` 은 각각 `ast.parse`·`bash -n`·`json.load` 로 문법을 확인했다.
