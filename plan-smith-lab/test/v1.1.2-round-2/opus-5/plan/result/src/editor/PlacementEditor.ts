import type { Vec2 } from '../core/Camera';
import type { MaterialName } from '../data/materials';
import type { StageDef } from '../data/stages';
import { el } from '../ui/dom';

/**
 * 개발 전용 배치 에디터 (플랜 P4, `?editor=1`).
 * 스테이지 10개를 손으로 배치하는 것이 최대 시간 리스크(R2)여서, 배치→JSON dump를 먼저 만든다.
 * 사용자용 레벨 에디터 공개는 §9에 따라 범위 밖 — 쿼리 파라미터로만 열린다.
 */
export class PlacementEditor {
  private material: MaterialName = 'wood';
  private mode: 'block' | 'pig' = 'block';
  private dragStart: Vec2 | null = null;
  private hint: HTMLDivElement;

  constructor(
    parent: HTMLElement,
    private readonly deps: {
      getStage: () => StageDef;
      rebuild: (stage: StageDef) => void;
    },
  ) {
    this.hint = el('div', 'editor-hint');
    parent.appendChild(this.hint);
    this.paint();
    window.addEventListener('keydown', this.onKey);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKey);
    this.hint.remove();
  }

  private paint(): void {
    this.hint.textContent =
      `EDITOR (?editor=1)\n` +
      `mode: ${this.mode}${this.mode === 'block' ? ` / ${this.material}` : ''}\n` +
      `1 wood  2 ice  3 stone\n` +
      `P 돼지  B 블록\n` +
      `드래그: 블록 생성\n` +
      `Z: 마지막 취소\n` +
      `J: JSON 콘솔 출력\n` +
      `R: 월드 재생성`;
  }

  private onKey = (e: KeyboardEvent): void => {
    const stage = this.deps.getStage();
    switch (e.key.toLowerCase()) {
      case '1':
        this.material = 'wood';
        break;
      case '2':
        this.material = 'ice';
        break;
      case '3':
        this.material = 'stone';
        break;
      case 'p':
        this.mode = 'pig';
        break;
      case 'b':
        this.mode = 'block';
        break;
      case 'z':
        if (this.mode === 'pig') stage.pigs.pop();
        else stage.blocks.pop();
        this.deps.rebuild(stage);
        break;
      case 'j':
        // eslint 없음: 개발 전용 경로
        console.log(JSON.stringify(stage, null, 2));
        break;
      case 'r':
        this.deps.rebuild(stage);
        break;
      default:
        return;
    }
    this.paint();
  };

  pointerDown(pt: Vec2): void {
    if (this.mode === 'pig') {
      const stage = this.deps.getStage();
      stage.pigs.push({ size: 'small', x: Math.round(pt.x), y: Math.round(pt.y) });
      this.deps.rebuild(stage);
      return;
    }
    this.dragStart = { x: pt.x, y: pt.y };
  }

  pointerUp(pt: Vec2): void {
    if (this.mode !== 'block' || !this.dragStart) return;
    const a = this.dragStart;
    this.dragStart = null;
    const w = Math.max(16, Math.abs(pt.x - a.x));
    const h = Math.max(16, Math.abs(pt.y - a.y));
    const stage = this.deps.getStage();
    stage.blocks.push({
      material: this.material,
      shape: 'box',
      x: Math.round((a.x + pt.x) / 2),
      y: Math.round((a.y + pt.y) / 2),
      w: Math.round(w),
      h: Math.round(h),
      angle: 0,
    });
    this.deps.rebuild(stage);
  }
}
