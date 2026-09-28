# split-1.6.0 발견

지표: [`METRICS.md`](METRICS.md)(생성물) · 원본: `runs/<입력>/r<k>/`(시도별 프롬프트·스트림·검사 결과, `output/` 에 인덱스·파트·unsplit).
실행 2026-09-28, 6 run 전부 DONE, 모두 1-shot(재개분 없음). Claude(opus) 6회, CLI 보고 합계 $5.09.
`p20k/r1` 은 러너를 `REPS=1 ./runner.sh p20k` 로 먼저 돌린 canary 호출에서 나왔고, 나머지 5개는 상태 인지형 러너의 본 호출이
`p20k/r1` 을 건너뛰고 만들었다. 설정(정의·프롬프트·모델·검사기)은 두 호출이 같다.

## 측정한 것

| ID | 관측 | k/n | 근거 |
|---|---|---|---|
| S1 | 실제 `plan-writer` 정의(`--agent plan-smith:plan-writer`)가 분할 규약만 받고 만든 분할이 검사기를 **첫 시도에 통과**했다 — 모든 줄이 한 번씩 순서대로, 이름·순서·다음 포인터 정상, 모든 파트가 제목이나 목록 항목에서 시작, 열린 코드 펜스 없음 | 6/6 | `attempt1.check.txt` |
| S2 | 파트 수는 6–11개였고 10,000자(목표)를 넘은 파트는 0개다. 가장 큰 파트는 9,933자(p37k) | 6 | METRICS |
| S3 | 코드 펜스 26개인 p32k도 두 run 모두 파트마다 펜스 수가 짝수였다 — 코드 블록 안에서 자르지 않았다 | 2/2 | 파트별 펜스 수 |
| S4 | 인덱스에 "holds no implementation" 경고문이 있고, 첫 파트는 `overview_A0`, 마지막 파트는 `contract_*` 였다(규약 규칙 5) | 6/6 | 인덱스·파트 이름 |
| S5 | 같은 입력이라도 분할은 결정적이지 않다: p37k는 두 run이 같은 7개 파트를 냈지만, p32k는 8개와 11개로 갈렸다 | — | METRICS 파트 열 |
| S6 | 비용과 시간(opus): run당 $0.66–1.08(중앙값 $0.79), 벽시계 142–252초(중앙값 157초), 9–14턴. 문자 수보다 코드 블록이 많은 입력(p32k)이 더 비쌌다 | 6 | METRICS |

## 해석

- 절차(옮기기 → 검사)는 코퍼스의 실제 큰 플랜 세 종류에서 문서대로 동작했다. 1.6.0의 "무손실로 나눈다"는 이 측정에 기대어 적을 수 있다.
- 분할은 공짜가 아니다: 큰 플랜 하나에 약 $0.8, 2.5분이 더 든다(opus). README·CHANGELOG에 이 비용을 적는다.
- 분할이 결정적이지 않으므로(S5), 같은 플랜을 다시 나누면 파트 경계가 달라질 수 있다 — 파트 이름을 외부에서 고정 참조하지 말 것.

## 측정하지 않은 것

- **분할의 효과**(구현자가 맥락을 덜 놓치는가) — 여전히 가설이다. [`../transfer/`](../transfer/) 의 약한 구현자 러너로 분할 대 단일 A/B를 할 수 있다(제안, 미실행).
- 재시도 경로(검사 실패 → 2번째 시도)는 실제 run에서 한 번도 발화하지 않았다. 검사기의 실패 판정은 `--self-test`(11 케이스)로만 확인했다.
- 메인 에이전트가 끼는 전체 파이프라인(Stage 1–3, Stage 3의 인덱스+파트 원문 전달), opus 외 모델, 반복 수 n=2.

## 대상과 릴리스의 차이

`subject/` 스냅샷 이후 플러그인에서 바뀐 것(`shasum -a 256 -c SUBJECT.sha256` 로 확인):

- 문서: plan-smith `CLAUDE.md`(루트 Rule 9 가리키기), 그리고 이 측정 결과를 적는 README 5개·CHANGELOG.
- `references/split.md` 의 **메인 에이전트 절차 3단계** 한 곳: 검사 명령을 `${CLAUDE_PLUGIN_ROOT}` 로 직접 적던 것을 "SKILL.md Stage 2d의
  명령을 쓴다"로 바꿨다. reference 파일에서는 그 변수가 치환되지 않아 명령이 깨지기 때문이다
  ([`../../plugin-platform-lab/reference-plugin-root-2.1.283/`](../../plugin-platform-lab/reference-plugin-root-2.1.283/) V03). 바꾼 형태는
  [`../../plugin-platform-lab/reference-pointer-2.1.283/`](../../plugin-platform-lab/reference-pointer-2.1.283/) V05에서 3/3 실행됐다.
  이 실험은 메인 에이전트 없이 러너가 검사기를 직접 불렀으므로 그 줄을 쓰지 않았다. 집필자에게 가는 "Split protocol" 절은 스냅샷과 글자까지 같다.
- SKILL.md, plan-writer.md, split-check.py 는 스냅샷과 같다.
