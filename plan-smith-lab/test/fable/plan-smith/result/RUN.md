# 슬링샷 스트라이크 — 실행 안내

## ① 스택
- 바닐라 JavaScript (ES Modules) + **Matter.js 0.20.0** (vendored: `vendor/matter.min.js`, 외부 네트워크 불필요)
- 렌더링: Canvas 2D 자체 드로잉
- 스테이지: 선언적 JSON 10개 (`stages/stage01.json` ~ `stage10.json`) + 인터프리터(`js/core/session.js`)
- 빌드 도구/번들러/npm 설치 없음 — 정적 파일 그대로 서빙

## ② 빌드 명령
**none** (빌드 불필요)

선택 — 검증 하네스(Node 18+, 스테이지 10개 솔루션 리플레이 10/10 클리어·결정성 20회·재구축 50회·판정 경로 시험):
```
node tools/verify.mjs
```

## ③ 서빙할 정적 디렉토리
**`.`** (이 디렉토리 자체 — `index.html`이 루트에 있음)

스테이지를 fetch로 로드하므로 정적 서버가 필요하다(file:// 불가):
```
python3 -m http.server 8080
# → http://localhost:8080/
```

## ④ 조작법
새총 근처에서 마우스로 새를 드래그해 당긴 뒤 놓으면 발사(점선 궤적 프리뷰 표시) · 모든 돼지 제거 시 클리어 · 우측 상단 ⏸ 버튼 = 일시정지(계속하기/다시하기/메인으로) · `Esc`/`p`로도 일시정지 토글.

## 개발 모드
`?dev=1`을 붙이면(예: `http://localhost:8080/?dev=1`) 좌하단 패널이 열린다:
솔루션 리플레이(현재 스테이지 자동 발사) · 10/10 전체 검증 · 결정성 20회 · 실시간 카운터(bodies/listeners/verdict/pausedSteps).
