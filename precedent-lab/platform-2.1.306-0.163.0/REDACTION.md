# REDACTION

- 원본 `runs/` 는 로컬에만 두고 git 에서 제외한다(`.gitignore`). 모든 원본 파일의 sha256 은 `specimens.sha256` 에 있다.
- 공개본 `runs-public/` 은 `redact.py` 가 만든다. 원본 중 `summary.json`·`probe.jsonl`·`answer.txt`·`prompt.txt`·`case.json`·`emitted.json` 만 옮긴다. 옮길 때 다음 경로를 치환한다.
  - 세션 scratch 경로 → `<scratch>`(`/private/tmp` 와 `/tmp` 두 표기), 그 escape 형 → `<scratch-key>`
  - Claude 설정 디렉터리 → `<claude-config>`, 홈 → `<home>`
- 제외하는 이유
  - scratch 경로에 비공개 레포 이름이 들어 있다.
  - Claude stream-json 의 init 레코드에 계정의 MCP 커넥터·스킬 목록이 들어 있다.
  - Codex `--json` 출력과 stderr 는 판정에 쓰지 않았다.
- 치환 뒤 남으면 안 되는 식별자 목록은 실행 시 환경 변수 `REDACT_FORBIDDEN` 으로 넘긴다. 이 저장소의 파일에는 그 목록을 적지 않는다. 하나라도 남으면 `redact.py` 가 중단한다.
- 치환은 공개본에만 적용했다. 판정·지표(`make_metrics.py`)는 원본에서 계산했다.
