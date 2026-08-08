// 애플리케이션 배선 — 상태 머신·고정 스텝 루프·입력 라우팅을 한 곳에서 묶는다.
//
// 입력 라우팅 규칙: 오버레이가 떠 있는 동안(PAUSED·CLEAR·FAIL) 캔버스 히트 테스트는
// 오버레이 버튼에만 도달한다. 월드 드래그는 상태 머신의 inputEnabled 가 막는다.

import { Loop } from './core/loop';
import { StateMachine } from './core/stateMachine';
import { Viewport } from './core/viewport';
import { Audio } from './core/audio';
import { SaveStore, recordClear } from './core/save';
import type { SaveData } from './core/save';

import { destroyWorld, loadStage, restartWorld } from './game/world';
import type { World } from './game/world';
import { stepTurn } from './game/turn';
import { SlingInput } from './game/input';
import { finalizeScore, starsFor } from './game/score';

import { drawWorld } from './render/renderer';
import { drawHud } from './ui/hud';
import { hitRect, muteButtonRect, pauseButtonRect } from './ui/pauseButton';
import { drawPauseOverlay, pickPauseAction } from './ui/pauseOverlay';
import { drawClearOverlay, pickClearAction } from './ui/clearOverlay';
import type { ClearSummary } from './ui/clearOverlay';
import { drawFailOverlay, pickFailAction } from './ui/failOverlay';
import { hitButton } from './ui/button';

import { drawMenu, menuButtons, pickMenuAction } from './scenes/menu';
import { backButton, drawStageSelect, hoverStageIndex, pickStage } from './scenes/stageSelect';
import { createBootState, drawBootScreen, pickBootAction, retryButton, runBoot } from './scenes/boot';
import type { BootState } from './scenes/boot';

import { stageDefs } from './stages';
import type { StageDef } from './stages/schema';

export class App {
  private viewport: Viewport;
  private sm = new StateMachine();
  private loop: Loop;
  private input = new SlingInput();
  private save: SaveData;
  private boot: BootState = createBootState();
  private world: World | null = null;
  private clearSummary: ClearSummary | null = null;
  private pointer = { x: -1, y: -1 };
  private audioUnlocked = false;

  constructor(canvas: HTMLCanvasElement) {
    this.viewport = new Viewport(canvas);
    this.save = SaveStore.load();
    Audio.setMuted(this.save.muted);

    this.loop = new Loop({
      fixedStep: (dt) => this.fixedStep(dt),
      frame: (dt) => this.frame(dt),
    });

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerCancel);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  start(): void {
    this.loop.start();
    void this.bootSequence();
  }

  private async bootSequence(): Promise<void> {
    const ok = await runBoot(this.boot);
    if (ok && this.sm.state === 'BOOT') this.sm.transition('MENU');
  }

  // ---------- 시뮬레이션 ----------

  private fixedStep(dt: number): void {
    if (this.sm.state !== 'PLAYING' || !this.world) return;
    const world = this.world;
    world.adapter.step(dt);
    const outcome = stepTurn(world);
    if (outcome === 'CLEAR') this.onClear(world);
    else if (outcome === 'FAIL') this.onFail();
  }

  private frame(dtSec: number): void {
    if (this.world && this.sm.state === 'PLAYING') {
      this.world.effects.update(dtSec);
      this.world.camera.update(this.world, dtSec);
    }
    this.render();
  }

  private onClear(world: World): void {
    const total = finalizeScore(world.score, world.birdsRemaining);
    const stars = starsFor(world.def, total);
    this.save = recordClear(this.save, world.def.id, total, stars);
    Audio.play('clear');
    this.clearSummary = {
      stageName: world.def.name,
      score: world.score,
      stars,
      best: this.save.best[world.def.id] ?? total,
      hasNext: world.def.id < stageDefs.length,
    };
    this.input.reset();
    this.sm.transition('CLEAR');
  }

  private onFail(): void {
    Audio.play('fail');
    this.input.reset();
    this.sm.transition('FAIL');
  }

  // ---------- 전이 ----------

  /**
   * 일시정지 진입. 진행 중이던 드래그를 먼저 취소한다 —
   * 취소하지 않으면 새가 당겨진 자리에 남고, 재개 시 옛 드래그 벡터가 살아 있어
   * 오버레이 뒤로 상태가 새어 나간다.
   */
  private pauseGame(): void {
    if (this.world) this.input.cancel(this.world);
    this.input.reset();
    Audio.play('ui');
    this.sm.transition('PAUSED');
  }

  private startStage(def: StageDef): void {
    if (this.world) destroyWorld(this.world);
    this.world = loadStage(def);
    this.input.reset();
    this.clearSummary = null;
    if (this.sm.state !== 'PLAYING') this.sm.transition('PLAYING');
  }

  private restartStage(): void {
    if (!this.world) return;
    this.world = restartWorld(this.world);
    this.input.reset();
    this.clearSummary = null;
    if (this.sm.state !== 'PLAYING') this.sm.transition('PLAYING');
  }

  private goMenu(): void {
    if (this.world) {
      destroyWorld(this.world);
      this.world = null;
    }
    this.input.reset();
    this.clearSummary = null;
    this.sm.transition('MENU');
  }

  private nextStage(): void {
    const current = this.world;
    if (!current) return;
    const idx = stageDefs.findIndex((d) => d.id === current.def.id);
    const next = stageDefs[idx + 1];
    if (!next) {
      this.goMenu();
      return;
    }
    this.startStage(next);
  }

  private toggleMute(): void {
    this.save.muted = !this.save.muted;
    Audio.setMuted(this.save.muted);
    SaveStore.write(this.save);
    Audio.play('ui');
  }

  // ---------- 입력 ----------

  private onPointerDown = (e: PointerEvent): void => {
    if (!this.audioUnlocked) {
      Audio.unlock();
      Audio.setMuted(this.save.muted);
      this.audioUnlocked = true;
    }
    const v = this.viewport.toVirtual(e.clientX, e.clientY);
    this.pointer = v;

    switch (this.sm.state) {
      case 'BOOT': {
        if (pickBootAction(this.boot, v.x, v.y)) void this.bootSequence();
        return;
      }
      case 'MENU': {
        const a = pickMenuAction(v.x, v.y);
        if (a === 'start') {
          Audio.play('ui');
          this.sm.transition('STAGE_SELECT');
        } else if (a === 'reset') {
          SaveStore.clear();
          this.save = SaveStore.load();
          Audio.setMuted(this.save.muted);
          Audio.play('ui');
        }
        return;
      }
      case 'STAGE_SELECT': {
        const picked = pickStage(this.save, v.x, v.y);
        if (picked === 'back') {
          Audio.play('ui');
          this.sm.transition('MENU');
        } else if (picked) {
          Audio.play('ui');
          this.startStage(picked);
        }
        return;
      }
      case 'PLAYING': {
        if (hitRect(pauseButtonRect(), v.x, v.y)) {
          this.pauseGame();
          return;
        }
        if (hitRect(muteButtonRect(), v.x, v.y)) {
          this.toggleMute();
          return;
        }
        if (!this.sm.inputEnabled || !this.world) return;
        this.input.pointerDown(this.world, v.x + this.world.camera.x, v.y, e.pointerId);
        return;
      }
      case 'PAUSED': {
        const a = pickPauseAction(v.x, v.y);
        if (!a) return;
        Audio.play('ui');
        if (a === 'resume') this.sm.transition('PLAYING');
        else if (a === 'restart') this.restartStage();
        else this.goMenu();
        return;
      }
      case 'CLEAR': {
        const a = pickClearAction(v.x, v.y, this.clearSummary?.hasNext ?? false);
        if (!a) return;
        Audio.play('ui');
        if (a === 'next') this.nextStage();
        else if (a === 'restart') this.restartStage();
        else this.goMenu();
        return;
      }
      case 'FAIL': {
        const a = pickFailAction(v.x, v.y);
        if (!a) return;
        Audio.play('ui');
        if (a === 'restart') this.restartStage();
        else this.goMenu();
        return;
      }
      default:
        return;
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    const v = this.viewport.toVirtual(e.clientX, e.clientY);
    this.pointer = v;
    if (this.sm.state !== 'PLAYING' || !this.sm.inputEnabled || !this.world) return;
    this.input.pointerMove(this.world, v.x + this.world.camera.x, v.y, e.pointerId);
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.sm.state !== 'PLAYING' || !this.sm.inputEnabled || !this.world) return;
    this.input.pointerUp(this.world, e.pointerId);
  };

  private onPointerCancel = (): void => {
    if (this.world) this.input.cancel(this.world);
  };

  // ---------- 렌더 ----------

  private render(): void {
    const ctx = this.viewport.ctx;
    this.viewport.begin();
    const p = this.pointer;

    switch (this.sm.state) {
      case 'BOOT':
        drawBootScreen(ctx, this.boot, hitButton(retryButton(), p.x, p.y));
        break;
      case 'MENU': {
        const hovered = menuButtons().find((b) => hitButton(b, p.x, p.y));
        drawMenu(ctx, this.save, hovered ? hovered.id : null);
        break;
      }
      case 'STAGE_SELECT':
        drawStageSelect(ctx, this.save, hoverStageIndex(p.x, p.y), hitButton(backButton(), p.x, p.y));
        break;
      default:
        this.renderGame(ctx, p);
        break;
    }

    this.viewport.end();
  }

  private renderGame(ctx: CanvasRenderingContext2D, p: { x: number; y: number }): void {
    const world = this.world;
    if (!world) return;

    drawWorld(ctx, world, {
      active: this.input.dragActive,
      dragX: this.input.dragX,
      dragY: this.input.dragY,
    });

    const hoverHud = hitRect(pauseButtonRect(), p.x, p.y)
      ? 'pause'
      : hitRect(muteButtonRect(), p.x, p.y)
        ? 'mute'
        : null;
    drawHud(ctx, world, this.save.muted, this.sm.state === 'PLAYING' ? hoverHud : null);

    if (this.sm.state === 'PAUSED') {
      drawPauseOverlay(ctx, pickPauseAction(p.x, p.y));
    } else if (this.sm.state === 'CLEAR' && this.clearSummary) {
      drawClearOverlay(ctx, this.clearSummary, pickClearAction(p.x, p.y, this.clearSummary.hasNext));
    } else if (this.sm.state === 'FAIL') {
      drawFailOverlay(ctx, world.pigsAlive, pickFailAction(p.x, p.y));
    }
  }
}
