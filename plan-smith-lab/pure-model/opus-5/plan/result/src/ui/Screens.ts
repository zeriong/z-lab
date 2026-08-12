import { HUD } from './HUD';
import { PauseOverlay } from './PauseOverlay';

/** Everything the UI can ask the game to do. */
export type UiAction =
  | { type: 'start' }
  | { type: 'open-levels' }
  | { type: 'back-main' }
  | { type: 'play-level'; id: number }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'restart' }
  | { type: 'next-level' }
  | { type: 'toggle-sound' };

export interface LevelCardInfo {
  id: number;
  name: string;
  unlocked: boolean;
  stars: number;
  best: number;
}

export interface MainMenuInfo {
  totalStars: number;
  maxStars: number;
  soundEnabled: boolean;
  resumeLevelId: number;
}

export interface ResultInfo {
  cleared: boolean;
  levelId: number;
  levelName: string;
  stars: number;
  blockScore: number;
  pigScore: number;
  birdBonus: number;
  total: number;
  best: number;
  hasNext: boolean;
  isFinalLevel: boolean;
}

const STAR_CHARS = ['★', '★', '★'];

/**
 * Screen switching (plan §7). No UI framework: six screens made of template
 * strings + delegated clicks is smaller than the framework would be, and the
 * canvas owns everything that actually animates.
 */
export class Screens {
  readonly hud: HUD;
  private readonly pauseOverlay: PauseOverlay;
  private screenLayer: HTMLElement | null = null;
  private resultLayer: HTMLElement | null = null;
  private toastEl: HTMLDivElement | null = null;
  private toastTimer = 0;

  constructor(
    private readonly root: HTMLElement,
    private readonly onAction: (action: UiAction) => void,
  ) {
    this.hud = new HUD(() => this.onAction({ type: 'pause' }));
    this.pauseOverlay = new PauseOverlay({
      onResume: () => this.onAction({ type: 'resume' }),
      onRestart: () => this.onAction({ type: 'restart' }),
      onMain: () => this.onAction({ type: 'back-main' }),
    });
  }

  // ------------------------------------------------------------- screens

  showMainMenu(info: MainMenuInfo): void {
    this.hideResult();
    this.hidePause();
    this.hud.el.remove();

    const layer = document.createElement('div');
    layer.className = 'menu center-col';
    layer.innerHTML = `
      <h1 class="menu__title">SLINGSHOT BIRDS</h1>
      <p class="menu__subtitle">돼지를 전부 날려버리자 · ${info.totalStars} / ${info.maxStars} ★</p>
      <button type="button" class="btn" data-action="start">게임 시작 (STAGE ${info.resumeLevelId})</button>
      <button type="button" class="btn btn--ghost" data-action="open-levels">스테이지 선택</button>
      <button type="button" class="btn btn--ghost" data-action="toggle-sound">
        사운드: ${info.soundEnabled ? 'ON' : 'OFF'}
      </button>
      <div class="menu__footer">드래그로 조준 · 놓으면 발사 · 비행 중 탭으로 능력 사용 · Esc 일시정지</div>
    `;
    layer.addEventListener('click', this.onDelegatedClick);
    this.setScreen(layer);
  }

  showLevelSelect(cards: LevelCardInfo[]): void {
    this.hideResult();
    this.hidePause();
    this.hud.el.remove();

    const layer = document.createElement('div');
    layer.className = 'levelselect';

    const grid = cards
      .map((card) => {
        const stars = STAR_CHARS.map((c, i) => (i < card.stars ? c : '☆')).join('');
        const best = card.best > 0 ? `${card.best.toLocaleString('en-US')}` : '—';
        return `
        <button type="button" class="levelcard" data-action="play-level" data-level="${card.id}" ${
          card.unlocked ? '' : 'disabled aria-label="잠김"'
        }>
          <span class="levelcard__no">${card.unlocked ? card.id : '🔒'}</span>
          <span class="levelcard__name">${card.unlocked ? card.name : 'LOCKED'}</span>
          <span class="levelcard__stars">${card.unlocked ? stars : ''}</span>
          <span class="levelcard__best">${card.unlocked ? best : ''}</span>
        </button>`;
      })
      .join('');

    layer.innerHTML = `
      <h2 class="overlay__title">스테이지 선택</h2>
      <div class="levelselect__grid">${grid}</div>
      <button type="button" class="btn btn--ghost btn--small" data-action="back-main">메인으로</button>
    `;
    layer.addEventListener('click', this.onDelegatedClick);
    this.setScreen(layer);
  }

  /** Switches to the in-game HUD. */
  showGame(levelLabel: string): void {
    this.hideResult();
    this.hidePause();
    this.setScreen(null);
    this.hud.setLevelLabel(levelLabel);
    this.hud.setScore(0, true);
    this.hud.setPauseVisible(true);
    this.root.append(this.hud.el);
  }

  // ------------------------------------------------------------ overlays

  showPause(): void {
    this.hud.setPauseVisible(false);
    this.pauseOverlay.show(this.root);
  }

  hidePause(): void {
    if (!this.pauseOverlay.isOpen) return;
    this.pauseOverlay.hide();
    this.hud.setPauseVisible(true);
  }

  get isPauseOpen(): boolean {
    return this.pauseOverlay.isOpen;
  }

  showResult(info: ResultInfo): void {
    this.hidePause();
    this.hud.setPauseVisible(false);
    this.hideResult();

    const layer = document.createElement('div');
    layer.className = 'overlay';
    layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-modal', 'true');

    const stars = STAR_CHARS.map(
      (c, i) => `<span class="star" data-star="${i}">${c}</span>`,
    ).join('');

    const ending = info.cleared && info.isFinalLevel
      ? '<p class="result__ending">모든 스테이지를 클리어했다. 돼지들은 잠시 조용해졌다.</p>'
      : '';

    const nextButton =
      info.cleared && info.hasNext
        ? '<button type="button" class="btn" data-action="next-level">다음 스테이지</button>'
        : '';

    layer.innerHTML = `
      <div class="dim"></div>
      <div class="center-col">
        <div class="panel overlay__panel">
          <h2 class="overlay__title">${info.cleared ? 'STAGE CLEAR' : 'STAGE FAILED'}</h2>
          ${info.cleared ? `<div class="result__stars">${stars}</div>` : ''}
          <div class="result__lines">
            <div class="result__line"><span>블록</span><span>${info.blockScore.toLocaleString('en-US')}</span></div>
            <div class="result__line"><span>돼지</span><span>${info.pigScore.toLocaleString('en-US')}</span></div>
            <div class="result__line"><span>남은 새 보너스</span><span>${info.birdBonus.toLocaleString('en-US')}</span></div>
            <div class="result__line result__line--total"><span>합계</span><span>${info.total.toLocaleString('en-US')}</span></div>
            <div class="result__line"><span>최고 점수</span><span>${info.best.toLocaleString('en-US')}</span></div>
          </div>
          ${ending}
          ${nextButton}
          <button type="button" class="btn ${info.cleared ? 'btn--ghost' : ''}" data-action="restart">다시하기</button>
          <button type="button" class="btn btn--ghost" data-action="back-main">메인으로</button>
        </div>
      </div>
    `;
    layer.addEventListener('click', this.onDelegatedClick);
    this.root.append(layer);
    this.resultLayer = layer;

    // Star pop-in, one after another.
    if (info.cleared) {
      const starEls = layer.querySelectorAll<HTMLElement>('.star');
      starEls.forEach((el, i) => {
        if (i >= info.stars) return;
        window.setTimeout(() => el.classList.add('is-on'), 220 + i * 260);
      });
    }

    layer.querySelector<HTMLButtonElement>('.btn')?.focus();
  }

  hideResult(): void {
    this.resultLayer?.remove();
    this.resultLayer = null;
  }

  get isResultOpen(): boolean {
    return this.resultLayer !== null;
  }

  toast(message: string): void {
    if (!this.toastEl) {
      this.toastEl = document.createElement('div');
      this.toastEl.className = 'toast';
      this.root.append(this.toastEl);
    }
    this.toastEl.textContent = message;
    this.toastEl.classList.add('is-on');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl?.classList.remove('is-on'), 1600);
  }

  // ------------------------------------------------------------ internals

  private setScreen(layer: HTMLElement | null): void {
    this.screenLayer?.remove();
    this.screenLayer = layer;
    if (layer) this.root.append(layer);
  }

  private onDelegatedClick = (event: Event): void => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    switch (action) {
      case 'start':
        this.onAction({ type: 'start' });
        break;
      case 'open-levels':
        this.onAction({ type: 'open-levels' });
        break;
      case 'back-main':
        this.onAction({ type: 'back-main' });
        break;
      case 'restart':
        this.onAction({ type: 'restart' });
        break;
      case 'next-level':
        this.onAction({ type: 'next-level' });
        break;
      case 'toggle-sound':
        this.onAction({ type: 'toggle-sound' });
        break;
      case 'play-level': {
        const id = Number(target.dataset.level);
        if (Number.isFinite(id)) this.onAction({ type: 'play-level', id });
        break;
      }
      default:
        break;
    }
  };
}
