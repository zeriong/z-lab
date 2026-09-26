/**
 * `?debug=1` 디버그 패널 (§10.5).
 * 와이어프레임 토글, 재질 파라미터 슬라이더(제자리 수정 → 새로 생성되는 바디부터 반영),
 * 현재 드래그의 각도·파워, 레벨 점프, 돼지 즉사, FPS/프레임 시간/바디 수.
 */
import { LEVEL_COUNT } from '../levels/index';
import type { Material } from '../levels/types';
import { BIRD, MATERIALS, PIG } from '../physics/Materials';
import { el } from '../ui/dom';

export interface DebugHooks {
  getShotInfo: () => { angle: number; power: number } | null;
  getStats: () => { fps: number; frameMs: number; bodies: number; state: string };
  jumpToLevel: (id: number) => void;
  killPigs: () => void;
  setWireframe: (on: boolean) => void;
}

export function isDebugEnabled(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('debug') === '1';
  } catch {
    return false;
  }
}

export class DebugPanel {
  readonly el: HTMLElement;
  private readonly readout: HTMLElement;

  constructor(root: HTMLElement, private readonly hooks: DebugHooks) {
    this.el = el('div', 'debug-panel');
    this.readout = el('div', 'readout');
    this.el.appendChild(this.readout);

    // 와이어프레임
    const wf = el('label');
    wf.appendChild(el('span', '', 'wireframe'));
    const cb = el('input');
    cb.type = 'checkbox';
    cb.addEventListener('change', () => hooks.setWireframe(cb.checked));
    wf.appendChild(cb);
    this.el.appendChild(wf);

    // 레벨 점프 / 돼지 즉사
    const row = el('div');
    for (let i = 1; i <= LEVEL_COUNT; i++) {
      const b = el('button', '', String(i));
      b.addEventListener('click', () => hooks.jumpToLevel(i));
      row.appendChild(b);
    }
    const kill = el('button', '', 'kill pigs');
    kill.addEventListener('click', () => hooks.killPigs());
    row.appendChild(kill);
    this.el.appendChild(row);

    // 재질 슬라이더
    const mats: Material[] = ['ice', 'wood', 'stone'];
    for (const m of mats) {
      this.el.appendChild(el('div', '', `— ${m} —`));
      this.slider(`${m}.health`, MATERIALS[m].health, 1, 100, 1, (v) => (MATERIALS[m].health = v));
      this.slider(`${m}.vuln`, MATERIALS[m].vulnerability, 0.1, 4, 0.1, (v) => (MATERIALS[m].vulnerability = v));
      this.slider(`${m}.density`, MATERIALS[m].density, 0.0002, 0.006, 0.0001, (v) => (MATERIALS[m].density = v));
      this.slider(`${m}.friction`, MATERIALS[m].friction, 0, 1, 0.05, (v) => (MATERIALS[m].friction = v));
    }
    this.el.appendChild(el('div', '', '— pig / bird —'));
    this.slider('pig.vuln', PIG.vulnerability, 0.1, 4, 0.1, (v) => (PIG.vulnerability = v));
    this.slider('bird.density', BIRD.density, 0.001, 0.01, 0.0005, (v) => (BIRD.density = v));
    this.slider('bird.restitution', BIRD.restitution, 0, 1, 0.05, (v) => (BIRD.restitution = v));

    root.appendChild(this.el);
  }

  private slider(
    name: string,
    value: number,
    min: number,
    max: number,
    step: number,
    apply: (v: number) => void,
  ): void {
    const label = el('label');
    const text = el('span', '', `${name} ${value}`);
    const input = el('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    input.addEventListener('input', () => {
      const v = Number(input.value);
      apply(v);
      text.textContent = `${name} ${v}`;
    });
    label.appendChild(text);
    label.appendChild(input);
    this.el.appendChild(label);
  }

  /** 매 프레임 호출 */
  update(): void {
    const s = this.hooks.getStats();
    const shot = this.hooks.getShotInfo();
    const shotText = shot ? `angle ${shot.angle.toFixed(1)}°  power ${shot.power.toFixed(3)}` : 'angle —  power —';
    this.readout.textContent = `${s.state} | fps ${s.fps.toFixed(0)} | frame ${s.frameMs.toFixed(2)}ms | bodies ${s.bodies}\n${shotText}`;
  }
}
