/**
 * OverlayLayer — 메뉴 / 스테이지 선택 / 일시정지 / 클리어 / 실패 (R1~R4, R23~R29).
 *
 * DOM으로 짓기로 한 이유(§11): 버튼 히트테스트·포커스·리사이즈 레이아웃을
 * 캔버스에 재구현하는 비용이, 스펙 명시 요구(우측 일시정지 + 2버튼)의 완성도를
 * 깎기 때문. 그 대가로 지켜야 하는 규칙이 하나 생겼다 —
 * **컨테이너는 pointer-events:none, 버튼만 auto.** (style.css)
 */

import type { StageResult } from '../game/score';

export type UiAction =
  | { type: 'START' }
  | { type: 'SELECT'; stage: number }
  | { type: 'BACK' }
  | { type: 'RESUME' }
  | { type: 'RETRY' }
  | { type: 'MENU' }
  | { type: 'NEXT' }
  | { type: 'TO_SELECT' }
  | { type: 'TOGGLE_SOUND' };

export type ScreenName = 'loading' | 'menu' | 'select' | 'pause' | 'clear' | 'fail' | 'none';

export interface StageCellView {
  id: number;
  name: string;
  unlocked: boolean;
  stars: number;
  best: number;
}

export interface SelectView {
  cells: StageCellView[];
  totalStars: number;
  maxStars: number;
  storageAvailable: boolean;
}

export class OverlayLayer {
  private root: HTMLDivElement;
  private screens = new Map<ScreenName, HTMLElement>();
  private current: ScreenName = 'none';

  constructor(
    parent: HTMLElement,
    private readonly onAction: (action: UiAction) => void,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'overlay-root';
    parent.appendChild(this.root);
    this.build();
  }

  // ------------------------------------------------------------------ 구축

  private section(name: ScreenName, html: string): HTMLElement {
    const el = document.createElement('section');
    el.className = 'overlay-screen';
    el.dataset.screen = name;
    el.innerHTML = html;
    this.root.appendChild(el);
    this.screens.set(name, el);
    return el;
  }

  private build(): void {
    this.section(
      'loading',
      `<h1 class="overlay-title">불러오는 중…</h1>
       <p class="overlay-sub">스테이지 데이터를 검증하고 있습니다.</p>`,
    );

    const menu = this.section(
      'menu',
      `<h1 class="overlay-title">슬링샷</h1>
       <p class="overlay-sub">새총을 당겨 구조물을 무너뜨리고 돼지를 모두 없애세요.<br>10개 스테이지.</p>
       <div class="button-row">
         <button class="btn btn-primary" data-act="start">게임 시작</button>
         <button class="btn btn-icon" data-act="sound" aria-label="사운드 켜기/끄기">🔊</button>
       </div>
       <p class="hint">
         드래그로 조준 → 놓으면 발사 · 비행 중 화면 탭으로 특수능력<br>
         일시정지는 인게임 <b>우측 상단</b> 버튼
       </p>`,
    );
    menu.querySelector('[data-act="start"]')?.addEventListener('click', () => this.onAction({ type: 'START' }));
    menu.querySelector('[data-act="sound"]')?.addEventListener('click', () => this.onAction({ type: 'TOGGLE_SOUND' }));

    const select = this.section(
      'select',
      `<h1 class="overlay-title">스테이지 선택</h1>
       <p class="overlay-sub"><span class="total-stars" data-role="total"></span></p>
       <div data-role="banner"></div>
       <div class="stage-grid" data-role="grid"></div>
       <div class="button-row">
         <button class="btn btn-ghost" data-act="back">메인으로</button>
       </div>`,
    );
    select.querySelector('[data-act="back"]')?.addEventListener('click', () => this.onAction({ type: 'BACK' }));

    const pause = this.section(
      'pause',
      `<h1 class="overlay-title">일시정지</h1>
       <p class="overlay-sub">물리 시뮬레이션이 멈춰 있습니다.</p>
       <div class="button-row">
         <button class="btn btn-primary" data-act="resume">계속하기</button>
         <button class="btn" data-act="retry">다시하기</button>
         <button class="btn btn-ghost" data-act="menu">메인으로</button>
       </div>`,
    );
    pause.querySelector('[data-act="resume"]')?.addEventListener('click', () => this.onAction({ type: 'RESUME' }));
    pause.querySelector('[data-act="retry"]')?.addEventListener('click', () => this.onAction({ type: 'RETRY' }));
    pause.querySelector('[data-act="menu"]')?.addEventListener('click', () => this.onAction({ type: 'MENU' }));

    const clear = this.section(
      'clear',
      `<h1 class="overlay-title">스테이지 클리어</h1>
       <div class="star-row" data-role="stars">
         <span class="star">★</span><span class="star">★</span><span class="star">★</span>
       </div>
       <div data-role="breakdown"></div>
       <div class="button-row">
         <button class="btn btn-primary" data-act="next">다음 스테이지</button>
         <button class="btn" data-act="retry">다시하기</button>
         <button class="btn btn-ghost" data-act="menu">메인으로</button>
       </div>`,
    );
    clear.querySelector('[data-act="next"]')?.addEventListener('click', () => {
      // 10스테이지에서는 이 버튼이 "스테이지 선택으로"로 바뀐다 (R28).
      const btn = clear.querySelector('[data-act="next"]') as HTMLButtonElement;
      this.onAction(btn.dataset.mode === 'select' ? { type: 'TO_SELECT' } : { type: 'NEXT' });
    });
    clear.querySelector('[data-act="retry"]')?.addEventListener('click', () => this.onAction({ type: 'RETRY' }));
    clear.querySelector('[data-act="menu"]')?.addEventListener('click', () => this.onAction({ type: 'MENU' }));

    const fail = this.section(
      'fail',
      `<h1 class="overlay-title">실패</h1>
       <p class="overlay-sub" data-role="reason"></p>
       <div data-role="breakdown"></div>
       <div class="button-row">
         <button class="btn btn-primary" data-act="retry">다시하기</button>
         <button class="btn btn-ghost" data-act="menu">메인으로</button>
       </div>`,
    );
    fail.querySelector('[data-act="retry"]')?.addEventListener('click', () => this.onAction({ type: 'RETRY' }));
    fail.querySelector('[data-act="menu"]')?.addEventListener('click', () => this.onAction({ type: 'MENU' }));
  }

  // ------------------------------------------------------------------ 표시

  private show(name: ScreenName, dimmed: boolean): void {
    this.screens.forEach((el, key) => el.classList.toggle('is-active', key === name));
    this.root.classList.toggle('is-dimmed', dimmed && name !== 'none');
    this.current = name;
  }

  get active(): ScreenName {
    return this.current;
  }

  hide(): void {
    this.show('none', false);
  }

  showLoading(): void {
    this.show('loading', true);
  }

  showMenu(muted: boolean): void {
    const btn = this.screens.get('menu')?.querySelector('[data-act="sound"]');
    if (btn) btn.textContent = muted ? '🔇' : '🔊';
    this.show('menu', true);
  }

  showSelect(view: SelectView): void {
    const screen = this.screens.get('select');
    if (!screen) return;

    const total = screen.querySelector('[data-role="total"]');
    if (total) total.textContent = `★ ${view.totalStars} / ${view.maxStars}`;

    const banner = screen.querySelector('[data-role="banner"]');
    if (banner) {
      banner.innerHTML = view.storageAvailable
        ? ''
        : `<div class="banner">이 브라우저에서는 진행도가 저장되지 않습니다 (localStorage 사용 불가).</div>`;
    }

    const grid = screen.querySelector('[data-role="grid"]');
    if (grid) {
      grid.innerHTML = '';
      view.cells.forEach((cell) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `stage-cell${cell.unlocked ? '' : ' is-locked'}`;
        btn.disabled = !cell.unlocked;
        const stars = cell.unlocked
          ? '★★★'.slice(0, cell.stars).padEnd(3, '☆')
          : '🔒';
        btn.innerHTML = `
          <span class="num">${cell.id}</span>
          <span class="stars">${stars}</span>
          <span class="best">${cell.best > 0 ? cell.best.toLocaleString('en-US') : '&nbsp;'}</span>
        `;
        if (cell.unlocked) {
          btn.addEventListener('click', () => this.onAction({ type: 'SELECT', stage: cell.id }));
        }
        grid.appendChild(btn);
      });
    }

    this.show('select', true);
  }

  showPause(): void {
    this.show('pause', true);
  }

  /** 별이 순차로 등장한다 (R27) */
  showClear(result: StageResult, isLastStage: boolean, isNewRecord: boolean): void {
    const screen = this.screens.get('clear');
    if (!screen) return;

    const nextBtn = screen.querySelector('[data-act="next"]') as HTMLButtonElement | null;
    if (nextBtn) {
      nextBtn.textContent = isLastStage ? '스테이지 선택으로' : '다음 스테이지';
      nextBtn.dataset.mode = isLastStage ? 'select' : 'next';
    }

    const stars = screen.querySelectorAll('.star');
    stars.forEach((s) => s.classList.remove('is-earned'));
    stars.forEach((s, i) => {
      if (i < result.stars) {
        window.setTimeout(() => s.classList.add('is-earned'), 260 + i * 240);
      }
    });

    const breakdown = screen.querySelector('[data-role="breakdown"]');
    if (breakdown) {
      breakdown.innerHTML = `
        <div class="score-line"><span>파괴 점수</span><span>${result.baseScore.toLocaleString('en-US')}</span></div>
        <div class="score-line"><span>남은 새 ${result.birdsLeft}마리</span><span>+${result.birdBonus.toLocaleString('en-US')}</span></div>
        <div class="score-line"><span>3별 기준</span><span>${result.targetScore.toLocaleString('en-US')}</span></div>
        <div class="score-total">${result.total.toLocaleString('en-US')}</div>
        ${isNewRecord ? '<div class="hint">신기록!</div>' : ''}
      `;
    }

    this.show('clear', true);
  }

  showFail(result: StageResult): void {
    const screen = this.screens.get('fail');
    if (!screen) return;

    const reason = screen.querySelector('[data-role="reason"]');
    if (reason) {
      reason.textContent = `새를 모두 사용했지만 돼지가 ${result.stageId > 0 ? '' : ''}남아 있습니다.`;
    }

    const breakdown = screen.querySelector('[data-role="breakdown"]');
    if (breakdown) {
      breakdown.innerHTML = `
        <div class="score-line"><span>이번 시도 점수</span><span>${result.baseScore.toLocaleString('en-US')}</span></div>
      `;
    }

    this.show('fail', true);
  }
}
