# RUN

1. **스택**: Vite 7 + TypeScript(바닐라, 프레임워크 없음) + Matter.js 0.20 (물리) + Canvas 2D 직접 렌더 + DOM UI 오버레이
2. **빌드 명령**: `npm install && npm run build`
3. **서빙할 정적 디렉토리**: `dist` (dist/index.html — 아무 정적 서버로 서빙, 예: `python3 -m http.server -d dist 8080`)
4. **조작법**: 메인 메뉴에서 스테이지 선택 → 새총의 새를 마우스(터치)로 드래그해 조준하고 놓으면 발사, 돼지를 전부 쓰러뜨리면 클리어 (우측 상단 ⏸ = 일시정지 → 계속하기/다시하기/메인으로)

부가:
- `npm run verify:stages` — 스테이지 10개 전부에 대해 안정성(자멸 없음)·재현성(결정적 리셋)·클리어 가능성(실물리 샷 탐색)을 헤드리스로 검증
- 진행도(최고 클리어 스테이지)는 localStorage에 저장되어 새로고침 후에도 유지
