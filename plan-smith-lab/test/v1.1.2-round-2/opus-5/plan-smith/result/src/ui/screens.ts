/**
 * 화면(DOM 오버레이) 관리 — 상태 머신의 상태 하나에 정확히 한 화면 구성이 대응된다.
 * 결과 화면은 클리어/실패 공용이며, 실패에서는 [다음 스테이지]가 노출되지 않는다(§1-B R6).
 */

import type { StageResult, StateName } from '../types';
import { starThresholds } from '../score';
import { hide, q, setText, show } from './dom';
import { STR } from './strings';

export class Screens {
  private main = q<HTMLElement>('#screen-main');
  private select = q<HTMLElement>('#screen-select');
  private pause = q<HTMLElement>('#screen-pause');
  private result = q<HTMLElement>('#screen-result');
  private resultTitle = q<HTMLElement>('#result-title');
  private resultStars = q<HTMLElement>('#result-stars');
  private breakdown = q<HTMLElement>('#result-breakdown');
  private total = q<HTMLElement>('#result-total');
  private btnNext = q<HTMLButtonElement>('#btn-next');
  private toastEl = q<HTMLElement>('#toast');
  private muteMain = q<HTMLButtonElement>('#btn-mute-main');
  private mutePause = q<HTMLButtonElement>('#btn-mute-pause');
  private starTimers: number[] = [];
  private toastTimer: number | null = null;

  /** 상태 → 화면 구성 (선언적으로 한 곳) */
  applyState(state: StateName): void {
    const visible: Record<StateName, HTMLElement[]> = {
      BOOT: [],
      MAIN: [this.main],
      SELECT: [this.select],
      PLAYING: [],
      PAUSED: [this.pause],
      CLEAR: [this.result],
      FAIL: [this.result],
    };
    for (const el of [this.main, this.select, this.pause, this.result]) hide(el);
    for (const el of visible[state]) show(el);
  }

  setMuteLabels(muted: boolean): void {
    const label = muted ? STR.soundOff : STR.soundOn;
    for (const btn of [this.muteMain, this.mutePause]) {
      setText(btn, label);
      btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    }
  }

  /** 결과 화면 채우기 + 별 순차 연출 */
  renderResult(r: StageResult, hasNext: boolean): void {
    setText(this.resultTitle, r.cleared ? STR.clearTitle : STR.failTitle);

    this.breakdown.textContent = '';
    const rows: Array<[string, string]> = [
      [STR.scorePigs, `${r.parts.pigs} × 1,000`],
      [STR.scoreBlocks, `${r.parts.blocks} × 100`],
      [STR.scoreBirds, r.cleared ? `${r.parts.birdsLeft} × 500` : '—'],
    ];
    if (r.cleared) {
      const th = starThresholds(r.par);
      rows.push(['기준', STR.starHint(th.star2, th.star3)]);
    } else {
      rows.push(['안내', STR.failHint]);
    }
    for (const [k, v] of rows) {
      const li = document.createElement('li');
      const a = document.createElement('span');
      a.textContent = k;
      const b = document.createElement('span');
      b.textContent = v;
      li.appendChild(a);
      li.appendChild(b);
      this.breakdown.appendChild(li);
    }

    setText(this.total, r.score.toLocaleString('ko-KR'));
    this.btnNext.classList.toggle('hidden', !(r.cleared && hasNext));

    // 별 연출: 매번 초기화 후 순차 점등 (이전 시도의 타이머가 남지 않게 정리)
    this.clearStarTimers();
    const stars = Array.from(this.resultStars.querySelectorAll<HTMLElement>('.star'));
    stars.forEach((s) => s.classList.remove('on'));
    if (r.cleared) {
      for (let i = 0; i < r.stars; i += 1) {
        const t = window.setTimeout(() => stars[i]?.classList.add('on'), 220 + i * 260);
        this.starTimers.push(t);
      }
    }
  }

  clearStarTimers(): void {
    for (const t of this.starTimers) window.clearTimeout(t);
    this.starTimers = [];
  }

  toast(message: string, ms = 3200): void {
    setText(this.toastEl, message);
    show(this.toastEl);
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => hide(this.toastEl), ms);
  }
}
