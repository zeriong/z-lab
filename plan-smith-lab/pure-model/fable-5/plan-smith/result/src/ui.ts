// DOM 오버레이 UI — 메인(M20), 스테이지 선택(M3), 일시정지 버튼/오버레이(M16·M17),
// 결과 오버레이(M21), 가로 권장 안내(M24/D2).
// 모든 버튼은 scene.ts의 goTo()만 호출한다 — 전이는 단일 함수 경유 (M19).

import { STAGES } from './stages';
import { loadSave } from './save';
import { goTo, onScene, scene } from './scene';
import type { Game } from './game';
import * as audio from './audio';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function btn(label: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', 'btn', label);
  b.addEventListener('click', () => {
    audio.unlock();
    onClick();
  });
  return b;
}

export function buildUI(root: HTMLElement, game: Game): void {
  // ── 메인 화면 (M20) — 접속에서 첫 발사까지 클릭 3회 이내 (§3) ──
  const main = el('div', 'overlay solid');
  const mainPanel = el('div', 'panel');
  mainPanel.appendChild(el('h1', 'title', '웹 앵그리버드'));
  mainPanel.appendChild(el('p', 'subtitle', '슬링샷을 당겨 돼지를 전부 쓰러뜨리세요'));
  mainPanel.appendChild(btn('게임 시작', () => goTo('SELECT')));
  main.appendChild(mainPanel);

  // ── 스테이지 선택 (M3) — 잠금/해제/별이 텍스트 없이 판독 (§3) ──
  const select = el('div', 'overlay solid');
  const selectPanel = el('div', 'panel wide');
  selectPanel.appendChild(el('h2', 'heading', '스테이지 선택'));
  const grid = el('div', 'select-grid');
  selectPanel.appendChild(grid);
  select.appendChild(selectPanel);

  function renderSelect(): void {
    grid.textContent = '';
    const save = loadSave();
    for (const st of STAGES) {
      const cell = el('button', 'cell');
      if (st.id <= save.unlocked) {
        cell.appendChild(el('div', 'num', String(st.id)));
        const got = save.stars[st.id] ?? 0;
        const stars = el('div', 'stars');
        for (let i = 0; i < 3; i++) {
          stars.appendChild(el('span', i < got ? 'star on' : 'star off', '★'));
        }
        cell.appendChild(stars);
        cell.addEventListener('click', () => {
          audio.unlock();
          goTo('PLAYING', { stage: st.id });
        });
      } else {
        cell.disabled = true;
        cell.classList.add('locked');
        cell.appendChild(el('div', 'num dim', String(st.id)));
        cell.appendChild(el('div', 'lock'));
      }
      grid.appendChild(cell);
    }
  }

  // ── 일시정지 버튼 (M16) — 우측 상단, PLAYING에서만 노출 ──
  const pauseBtn = el('button', 'pause-btn');
  pauseBtn.setAttribute('aria-label', '일시정지');
  pauseBtn.appendChild(el('span', 'bar'));
  pauseBtn.appendChild(el('span', 'bar'));
  pauseBtn.addEventListener('click', () => goTo('PAUSED'));

  // ── 일시정지 오버레이 (M17) ──
  const pause = el('div', 'overlay dim');
  const pausePanel = el('div', 'panel');
  pausePanel.appendChild(el('h2', 'heading', '일시정지'));
  pausePanel.appendChild(btn('계속하기', () => goTo('PLAYING'))); // stage 미지정 → 그 시점 그대로 재개 (M18)
  pausePanel.appendChild(btn('다시하기', () => goTo('PLAYING', { stage: game.stageId })));
  pausePanel.appendChild(btn('메인으로', () => goTo('MAIN')));
  pause.appendChild(pausePanel);

  // ── 결과 오버레이 (M21) ──
  const result = el('div', 'overlay dim');
  const resultPanel = el('div', 'panel');
  result.appendChild(resultPanel);

  function renderResult(kind: 'CLEAR' | 'FAIL'): void {
    resultPanel.textContent = '';
    if (kind === 'CLEAR') {
      resultPanel.appendChild(el('h2', 'heading', '클리어!'));
      const stars = el('div', 'stars big');
      const got = game.lastResult ? game.lastResult.stars : 1;
      for (let i = 0; i < 3; i++) {
        stars.appendChild(el('span', i < got ? 'star on' : 'star off', '★'));
      }
      resultPanel.appendChild(stars);
      resultPanel.appendChild(
        el('p', 'score-line', `점수 ${game.lastResult ? game.lastResult.score : game.score}`),
      );
      if (game.stageId < STAGES.length) {
        resultPanel.appendChild(btn('다음 스테이지', () => goTo('PLAYING', { stage: game.stageId + 1 })));
      }
      resultPanel.appendChild(btn('다시하기', () => goTo('PLAYING', { stage: game.stageId })));
      resultPanel.appendChild(btn('메인으로', () => goTo('MAIN')));
    } else {
      resultPanel.appendChild(el('h2', 'heading', '실패…'));
      resultPanel.appendChild(el('p', 'score-line', `점수 ${game.score}`));
      resultPanel.appendChild(btn('다시하기', () => goTo('PLAYING', { stage: game.stageId })));
      resultPanel.appendChild(btn('메인으로', () => goTo('MAIN')));
    }
  }

  // ── 가로 권장 안내 (M24에 포함, D2) ──
  const portrait = el('div', 'portrait-note', '가로 화면을 권장합니다');
  document.body.appendChild(portrait);
  const updatePortrait = (): void => {
    portrait.classList.toggle('show', window.innerHeight > window.innerWidth);
  };
  window.addEventListener('resize', updatePortrait);
  updatePortrait();

  root.appendChild(main);
  root.appendChild(select);
  root.appendChild(pause);
  root.appendChild(result);
  root.appendChild(pauseBtn);

  // ── 씬 → 표시 동기화 ──
  function sync(): void {
    const s = scene();
    main.classList.toggle('hidden', s !== 'MAIN');
    select.classList.toggle('hidden', s !== 'SELECT');
    pause.classList.toggle('hidden', s !== 'PAUSED');
    result.classList.toggle('hidden', s !== 'CLEAR' && s !== 'FAIL');
    pauseBtn.classList.toggle('hidden', s !== 'PLAYING');
  }

  onScene((to) => {
    if (to === 'SELECT') renderSelect();
    if (to === 'CLEAR') renderResult('CLEAR');
    if (to === 'FAIL') renderResult('FAIL');
    sync();
  });
  sync(); // 부팅 시 MAIN 표시
}
