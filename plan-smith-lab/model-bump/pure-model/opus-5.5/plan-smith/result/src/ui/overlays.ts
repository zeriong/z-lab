// DOM 오버레이 (§4.11): 메뉴·스테이지 선택·HUD·일시정지·결과.
// 화면은 씬이 바뀔 때마다 새로 만든다 → 같은 data-testid가 동시에 두 개 존재하지 않고,
// 이전 화면의 HUD·버튼이 남지 않는다.
import type { Game } from '../core/game';
import { STAGE_COUNT } from '../config';
import type { BirdType, SceneId } from '../types';
import { S } from './strings';

type Child = Node | string | null | undefined | false;

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | boolean | undefined> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

const LOCK_SVG =
  '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" fill="currentColor"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';

function starRow(count: number, className: string): HTMLElement {
  const row = h('span', { class: className });
  for (let i = 0; i < 3; i++) row.append(h('span', { class: `star ${i < count ? 'on' : 'off'}` }, '★'));
  return row;
}

export interface OverlayDeps {
  app: HTMLElement;
  ui: HTMLElement;
  game: Game;
}

export class Overlays {
  private builtScene: SceneId | null = null;
  private hud: {
    stage: HTMLElement;
    birds: HTMLElement;
    score: HTMLElement;
    pigs: HTMLElement;
    birdKey: string;
  } | null = null;

  constructor(private readonly deps: OverlayDeps) {}

  /** 상태가 바뀔 때마다 호출. 씬이 바뀌었으면 화면을 다시 만들고, 아니면 HUD만 갱신 */
  sync(): void {
    const { game, app } = this.deps;
    const scene = game.scene;
    if (scene !== this.builtScene) this.build(scene);
    this.updateHud();

    const s = game.session;
    app.dataset['scene'] = scene;
    app.dataset['phase'] = s && scene !== 'MAIN_MENU' && scene !== 'STAGE_SELECT' ? s.phase : '';
    app.dataset['birdsLeft'] = String(s ? s.birdsLeft : 0);
    app.dataset['pigsLeft'] = String(s ? s.pigsAlive : 0);
    app.dataset['stage'] = String(game.state.stage ?? '');
  }

  private build(scene: SceneId): void {
    const { ui } = this.deps;
    this.builtScene = scene;
    this.hud = null;
    ui.replaceChildren();
    switch (scene) {
      case 'MAIN_MENU':
        ui.append(this.buildMain());
        break;
      case 'STAGE_SELECT':
        ui.append(this.buildSelect());
        break;
      case 'PLAYING':
        ui.append(this.buildHud());
        break;
      case 'PAUSED':
        ui.append(this.buildHud(), this.buildPause());
        break;
      case 'RESULT_CLEAR':
      case 'RESULT_FAIL':
        ui.append(this.buildResult());
        break;
    }
    const focusTarget = ui.querySelector<HTMLButtonElement>('[data-autofocus]');
    focusTarget?.focus({ preventScroll: true });
  }

  private button(testid: string, label: string, onClick: () => void, cls = 'btn', extra: Record<string, string | boolean> = {}): HTMLButtonElement {
    const b = h('button', { type: 'button', class: cls, 'data-testid': testid, ...extra }, label);
    b.addEventListener('click', (e) => {
      e.preventDefault();
      onClick();
    });
    return b;
  }

  private muteButton(): HTMLButtonElement {
    const { game } = this.deps;
    const label = () => (game.save.muted ? S.muteOn : S.muteOff);
    const b = this.button('btn-mute', label(), () => {
      game.toggleMute();
      b.textContent = label();
      b.setAttribute('aria-pressed', String(game.save.muted));
    }, 'btn secondary mute-toggle', { 'aria-label': S.muteAria, 'aria-pressed': String(game.save.muted) });
    return b;
  }

  private buildMain(): HTMLElement {
    const { game } = this.deps;
    return h(
      'div',
      { class: 'screen screen-main' },
      h(
        'div',
        { class: 'backdrop' },
        h(
          'div',
          { class: 'main-col' },
          h('h1', { class: 'title' }, S.title),
          this.button('btn-start', S.start, () => game.startGame(), 'btn', { 'data-autofocus': true }),
          this.muteButton(),
        ),
      ),
    );
  }

  private buildSelect(): HTMLElement {
    const { game } = this.deps;
    const grid = h('div', { class: 'stage-grid' });
    const unlocked = game.save.unlocked;
    for (let n = 1; n <= STAGE_COUNT; n++) {
      const locked = n > unlocked;
      const rec = game.save.record(n);
      const b = h('button', {
        type: 'button',
        class: 'stage-btn',
        'data-testid': `btn-stage-${n}`,
        'data-stars': String(rec.stars),
        'aria-label': locked ? `${S.stage(n)} ${S.locked}` : `${S.stage(n)} ★${rec.stars}`,
        disabled: locked,
      });
      b.append(h('span', { class: 'num' }, String(n)));
      if (locked) {
        const lock = h('span', { class: 'lock' });
        lock.innerHTML = LOCK_SVG;
        b.append(lock);
      } else {
        b.append(starRow(rec.stars, 'stars'));
      }
      b.addEventListener('click', () => {
        if (!locked) game.selectStage(n);
      });
      grid.append(b);
    }
    const first = grid.querySelector<HTMLButtonElement>('button:not([disabled])');
    first?.setAttribute('data-autofocus', '');
    return h(
      'div',
      { class: 'screen screen-select' },
      h(
        'div',
        { class: 'backdrop dim' },
        h('div', { class: 'panel' }, h('h2', {}, S.selectTitle), grid, this.button('btn-back', S.back, () => game.back(), 'btn secondary')),
      ),
    );
  }

  private buildHud(): HTMLElement {
    const { game } = this.deps;
    const stage = h('div', { class: 'hud-stage', 'data-testid': 'hud-stage' });
    const birds = h('div', { class: 'hud-birds', 'data-testid': 'hud-birds' });
    const score = h('div', { class: 'hud-score', 'data-testid': 'hud-score' });
    const pigs = h('div', { class: 'hud-pigs' });
    const pause = h('button', {
      type: 'button',
      class: 'btn-pause',
      'data-testid': 'btn-pause',
      'aria-label': S.pause,
      title: S.pause,
    });
    pause.append(h('span', { class: 'bar' }), h('span', { class: 'bar' }));
    pause.addEventListener('click', (e) => {
      e.preventDefault();
      game.togglePause();
    });
    this.hud = { stage, birds, score, pigs, birdKey: '' };
    return h(
      'div',
      { class: 'screen screen-hud', 'data-testid': 'hud' },
      h('div', { class: 'hud-left' }, stage, birds),
      h('div', { class: 'hud-center' }, score, pigs),
      pause,
    );
  }

  private updateHud(): void {
    const hud = this.hud;
    const s = this.deps.game.session;
    if (!hud || !s) return;
    hud.stage.textContent = S.stage(s.stage.id);
    hud.score.textContent = s.score.toLocaleString('ko-KR');
    hud.pigs.textContent = S.pigsLeft(s.pigsAlive);
    const order: BirdType[] = [];
    if (s.slingshot.state !== 'EMPTY' && s.slingshot.birdType) order.push(s.slingshot.birdType);
    order.push(...s.birdQueue);
    const key = order.join(',');
    if (key !== hud.birdKey) {
      hud.birdKey = key;
      hud.birds.replaceChildren(...order.map((t) => h('span', { class: `bird-icon ${t}`, title: t })));
    }
  }

  private buildPause(): HTMLElement {
    const { game } = this.deps;
    return h(
      'div',
      { class: 'screen screen-pause' },
      h(
        'div',
        { class: 'backdrop dim' },
        h(
          'div',
          { class: 'panel', role: 'dialog', 'aria-label': S.pause },
          h('h2', {}, S.pause),
          this.button('btn-resume', S.resume, () => game.resume(), 'btn', { 'data-autofocus': true }),
          this.button('btn-restart', S.restart, () => game.restart()),
          this.button('btn-main', S.toMain, () => game.toMain(), 'btn secondary'),
          this.muteButton(),
        ),
      ),
    );
  }

  private buildResult(): HTMLElement {
    const { game } = this.deps;
    const r = game.lastResult;
    const cleared = game.scene === 'RESULT_CLEAR';
    const panel = h('div', { class: 'panel', role: 'dialog', 'data-testid': 'result-panel' });
    if (cleared && r) {
      panel.append(
        h('h2', {}, S.clear),
        (() => {
          const row = h('div', { class: 'result-stars', 'data-testid': 'result-stars', 'data-stars': String(r.stars) });
          for (let i = 0; i < 3; i++) row.append(h('span', { class: `star ${i < r.stars ? 'on' : ''}` }, '★'));
          return row;
        })(),
        h('div', { class: 'result-score', 'data-testid': 'result-score' }, S.score(r.score)),
        h('div', { class: 'result-best' }, S.best(r.bestScore), r.newBest ? h('span', { class: 'new' }, S.newBest) : null),
      );
      const row = h('div', { class: 'btn-row' });
      row.append(this.button('btn-restart', S.restart, () => game.restart(), 'btn secondary'));
      if (r.isLast) {
        panel.append(h('div', { class: 'result-done', 'data-testid': 'all-clear' }, S.allClear));
      } else {
        row.append(this.button('btn-next', S.next, () => game.nextStage(), 'btn', { 'data-autofocus': true }));
      }
      row.append(this.button('btn-main', S.toMain, () => game.toMain(), 'btn secondary'));
      panel.append(row);
    } else {
      panel.append(
        h('h2', { class: 'result-fail-title' }, S.fail),
        h('div', {}, S.failHint),
        h(
          'div',
          { class: 'btn-row' },
          this.button('btn-restart', S.restart, () => game.restart(), 'btn', { 'data-autofocus': true }),
          this.button('btn-main', S.toMain, () => game.toMain(), 'btn secondary'),
        ),
      );
    }
    return h('div', { class: 'screen screen-result' }, h('div', { class: 'backdrop dim' }, panel));
  }
}
