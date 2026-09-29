# reference-plugin-root-2.1.283 발견

지표: [`METRICS.md`](METRICS.md)(생성물) · 원본: `runs/r<k>/`. 실행 2026-09-28, 3 단위 전부 DONE(1-shot, 재개분 없음).
선행: [`../skill-plugin-root-2.1.283/`](../skill-plugin-root-2.1.283/)(V01–V02). 후속: 우회 방식 두 가지는 [`../reference-pointer-2.1.283/`](../reference-pointer-2.1.283/)(V05–V07).

## 측정한 것

| ID | 관측 | n | 근거 |
|---|---|---|---|
| V03 | 스킬이 Read로 나중에 여는 **reference 파일**의 `${CLAUDE_PLUGIN_ROOT}` 는 바뀌지 않는다 — Read 결과에 리터럴 변수가 그대로 있고, 모델은 그것을 그대로 실행해 `bash: /scripts/hello.sh: No such file or directory` (exit 127)를 받았다 | 3/3 | METRICS 첫 Bash 명령·결과 |
| V04 | 그 뒤 모델이 스스로 복구해 스크립트를 실행한 경우는 없었다(`HELLO-MARK` 0/3). r2·r3은 스킬 폴더 아래 `scripts/` 를 추측했다가 실패했고, r1은 `find` 로 스크립트를 찾은 뒤 `CLAUDE_PLUGIN_ROOT=<경로> bash "${CLAUDE_PLUGIN_ROOT}/…"` 를 시도했다 — 같은 명령 안의 앞선 할당은 그 명령의 확장에 쓰이지 않으므로 다시 실패했다 | 0/3 | `runs/r<k>/stream.jsonl` |

## 해석

- V01과 합치면: 치환은 **로드되는 SKILL.md 텍스트에만** 일어난다. reference 파일에 스크립트 경로를 적을 때 이 변수를 쓰면
  그 명령은 깨진다. 경로는 SKILL.md에 두고 reference는 거기를 가리키거나(`<plugin>/…` 처럼 SKILL.md가 정의한 이름),
  SKILL.md 본문에 명령을 둔다.
- 이 실험 때문에 바뀐 것(because-i-needed): plan-smith 1.6.0 `references/split.md` 의 검사 명령을 SKILL.md Stage 2d로 돌렸고,
  ux-ui `skills/build-mobile/references/backend-detection.md` 의 `capture` 명령 두 개(28·85·86행)가 같은 결함을 가진 것을 확인해
  ux-ui `CLAUDE.md` 에 미수정 결함으로 기록했다.

## 방법상의 한계

- `--max-turns 6` 이다. 턴이 더 있었다면 복구했을 수도 있다 — V04는 "이 한도 안에서"의 결과다. r1의 `num_turns` 는 7로 자가보고됐다(한도와의 차이 원인은 재지 않았다).
- haiku만 쟀다. 더 강한 모델은 복구를 더 잘할 수 있지만, V03(파일이 리터럴로 읽힌다)은 모델과 무관한 도구 동작이다.

## 측정하지 않은 것

SPEC의 목록 그대로: 대화형 세션, 다른 모델, 더 긴 턴 한도에서의 복구 빈도.
