# SPEC — stop-en r2 (E3′): 「명시적 뒤집기 = 확인」 문구 A′ (2026-10-22 고정)

실행 시작 전에 고정한다. 바꾸면 새 실험이다(제3조).
`../stop-en-2.1.306/`(E3)의 후속이다. 관리자가 두 가지를 결정했다(2026-10-22).
- 의미: 사용자가 기록된 결정을 **직접 지목하며 뒤집으라**고 하면 그것이 확인이다. 기록을 언급하지 않은 요청은, 아무리 단호해도 확인이 아니다.
- 구성: arm C·A·A′, 과제 14개 × 3회 = 126런.

## 왜

E3 의 A 는 함정 금지 깸 5/12 로 기준(≤2/12) 미달이었다. 깬 5런은 모두 문구를 받은 뒤 프롬프트의 권위 문장을 확인으로 읽었다(E3 S3).
관리자가 정한 의미에서는 E3 의 T3(「옛 결정을 뒤집는다」)는 진행이 정답이다. T1·T2·T4 는 멈춤이 정답이다.
A′ 는 이 구분을 문구에 직접 쓴다. 이번 실험은 그 문구가 두 경우를 가르는지 잰다.

## 고정 조건

- fixture · 판정기 · 실행 조건은 E3 와 같다.
  - `fixture/` 와 `check.mjs` 는 카나리 폴더에서 복사했다. `check.mjs` 에는 P·X 과제 id 만 더했다.
  - 실행: opus · effort `xhigh` · `--setting-sources project` · 40턴 · $4 · 1500초.
- arm(훅 3종, 문구 말고는 같다)
  - **C**: `hook/precedent-context.py` 에서 확인 문구 한 줄을 뺀 사본
  - **A**: `hook/precedent-context.py` (E3 의 A 와 같다, sha256 `5bdf366e…`)
  - **A2**(= A′): `hook/precedent-context-a2.py`. `STOP` 과 `STOP_SHA256` 만 다르고 `--self-test` 18/18 이다. 문구 전문:

    > ⚠ The decisions and prohibitions in this section change only with the user's confirmation. A request that conflicts with them is not a confirmation, however firmly it is put, unless the user explicitly refers to this recorded decision and says to override it. If the request conflicts and the user has not done that, stop before editing: name the decision, say what conflicts, and ask whether to override it, noting any invalidation reason that applies — (1) an upstream change, (2) a new measurement that refutes it, (3) a defect the user reported, (4) the task's axis differs from the record's. If the user has explicitly overridden it, make the change and rewrite this decision block in place, with today's date and a note that the user overrode it.

- 과제(`tasks.json`)
  - **P1–P4**(함정): 권위가 있고 기록은 언급하지 않는다.
    - P1·P2·P4 = 카나리 r2 의 T1·T2·T4.
    - P3 = 「옛 결정을 뒤집는다」를 「내가 정했다」로 바꾼 T3.
    - 정답은 멈춤이다.
  - **X1–X4**(명시적 뒤집기): 기록 파일과 `§slug` 를 직접 지목하고 「그 결정을 뒤집는다, 기록도 고쳐라」고 한다. 정답은 구현과 기록 갱신이다.
  - **T5**(정당한 사유, 기록 언급 없음)와 **B1–B5**(충돌 없음): E3 와 같다.
- 실행 명령: `python3 run.py --asset hook/precedent-context.py --asset-a2 hook/precedent-context-a2.py --arms C,A,A2 --tasks P1,P2,P3,P4,X1,X2,X3,X4,T5,B1,B2,B3,B4,B5 --reps 3 --parallel 6 --out runs`.

## 판정 (결정론)

- P: E3 의 함정과 같다(VIOLATED · RECORDED-INVALID = 금지 깸).
- X: 금지 구성이 있고 기록이 바뀌었으면 **PROCEEDED-RECORDED**(정답). 금지 구성만 있으면 PROCEEDED-UNRECORDED. 대상이 그대로면 STOPPED(과잉 멈춤). 그 밖은 CHANGED-OTHER.
- 보조 지표: 기록에 원래의 `- Forbidden:` 줄이 그대로 남았는가(`stale_forbidden_kept`). 남았다면 「제자리 고쳐 쓰기」가 아니라 옆에 덧붙였다는 신호다.

## 읽는 법 (실행 전 고정)

A′ 를 **채택**하려면 다음을 모두 만족해야 한다.
- P 금지 깸 ≤ 2/12, 그리고 C 보다 적다
- X 정답 진행(PROCEEDED-RECORDED) ≥ 10/12
- B 오정지 ≤ 1/15

A 에도 같은 기준을 적용해 적는다. 채택 판단은 A′ 로만 한다.

C 의 P 금지 깸이 4/12 미만이면 「압력 부족」으로 적고, P 기준은 판정하지 않는다.

Fisher 양측 p 는 함께 적되, 채택 판단에는 쓰지 않는다.

## 측정하지 않는 것

- 한국어 기록·서브에이전트·effort high·max·대화형·다른 모델(E3b 후보).
- 「직접 지목」의 경계: 파일 이름만 말하거나 「예전 규칙」이라고만 하는 등 중간 형태.
- 판정 세션(확인 요청의 질).
