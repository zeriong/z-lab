import Matter from 'matter-js';
import { PhysicsAdapter } from './engine/physicsAdapter';
import { GameStateMachine } from './state/stateMachine';
import { STAGES } from './stages';
import { LoadedStage, anchorRadiusFor, loadStage } from './stages/loadStage';
import { registerCollisionRules } from './game/collisions';
import { consumeProjectile, evaluateOutcome } from './game/outcome';
import { DragVector, dragToLaunchVector, isWithinAnchorRadius, predictTrajectory, TrajectoryPoint } from './game/slingshotInput';
import { launchProjectile, spawnProjectileAtAnchor } from './game/launch';
import { Hud } from './ui/hud';
import { createPauseButton, PauseOverlay } from './ui/pauseOverlay';
import { renderClearScreen, renderFailScreen } from './ui/resultScreen';
import { renderMainMenu } from './ui/mainMenu';
import { unlockStage } from './progress/progressStore';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 600;

/**
 * 게임 전체 배선(App). 상태머신 각 상태의 onEnter/onExit에 스텝 2-9의 모듈을 연결한다.
 */
export class App {
  private root: HTMLElement;
  private stateMachine = new GameStateMachine();
  private adapter = new PhysicsAdapter(1);
  private render: Matter.Render | null = null;
  private loaded: LoadedStage | null = null;
  private hud: Hud | null = null;
  private pauseOverlay: PauseOverlay | null = null;
  private currentProjectile: Matter.Body | null = null;
  private dragOrigin: { x: number; y: number } | null = null;
  private lastTrajectoryPoints: TrajectoryPoint[] = [];

  constructor(root: HTMLElement) {
    this.root = root;
    this.wireStateMachine();
  }

  start(): void {
    this.showMainMenu();
  }

  private clearRoot(): void {
    this.root.innerHTML = '';
  }

  private wireStateMachine(): void {
    this.stateMachine.onEnter('Loading', (ctx) => {
      const stageIndex = ctx.currentStageIndex ?? 0;
      const stage = STAGES[stageIndex];
      this.clearRoot();
      this.loaded = loadStage(this.adapter, stage);
      this.setupGameCanvas();
      registerCollisionRules(this.adapter, this.loaded, () => this.onCollisionOutcome());
      this.stateMachine.dispatch({ type: 'STAGE_READY' });
    });

    this.stateMachine.onEnter('Playing', () => {
      this.adapter.start();
      this.spawnNextProjectile();
    });

    this.stateMachine.onEnter('Paused', () => {
      // 리스크 완화: Paused 전이 시 물리 시뮬레이션(Runner) 정지 — 오버레이 뒤 월드가 멈춰야 한다.
      this.adapter.stop();
      this.showPauseOverlay();
    });

    this.stateMachine.onExit('Paused', () => {
      this.pauseOverlay?.destroy();
      this.pauseOverlay = null;
    });

    this.stateMachine.onEnter('Cleared', () => {
      this.adapter.stop();
      const stageIndex = this.stateMachine.getContext().currentStageIndex ?? 0;
      unlockStage(stageIndex + 1);
      const nextStageUnlocked = stageIndex + 1 < STAGES.length;
      renderClearScreen(
        this.root,
        { nextStageUnlocked },
        {
          onNext: () => this.stateMachine.dispatch({ type: 'NEXT_STAGE' }),
          onRetry: () => {},
          onMainMenu: () => this.stateMachine.dispatch({ type: 'MAIN_MENU' }),
        }
      );
    });

    this.stateMachine.onEnter('Failed', () => {
      this.adapter.stop();
      renderFailScreen(this.root, {
        onRetry: () => this.stateMachine.dispatch({ type: 'RETRY' }),
        onMainMenu: () => this.stateMachine.dispatch({ type: 'MAIN_MENU' }),
      });
    });

    this.stateMachine.onEnter('MainMenu', () => {
      this.showMainMenu();
    });
  }

  private showMainMenu(): void {
    this.clearRoot();
    renderMainMenu(this.root, STAGES, {
      onSelectStage: (stageIndex) => this.stateMachine.dispatch({ type: 'LOAD_STAGE', stageIndex }),
    });
  }

  private setupGameCanvas(): void {
    if (!this.loaded) return;
    const stage = this.loaded.stage;

    const gameContainer = document.createElement('div');
    gameContainer.className = 'game-container';
    gameContainer.style.backgroundImage = `url(${stage.background})`;
    this.root.appendChild(gameContainer);

    this.render = Matter.Render.create({
      element: gameContainer,
      engine: this.adapter.engine,
      options: {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        wireframes: false,
        background: 'transparent',
      },
    });
    Matter.Render.run(this.render);

    this.hud = new Hud(gameContainer);
    this.hud.update(this.loaded.projectilesRemaining);

    createPauseButton(gameContainer, () => this.stateMachine.dispatch({ type: 'PAUSE' }));

    this.setupDragInput();
    this.setupTrajectoryOverlay();
  }

  private setupDragInput(): void {
    const canvas = this.render?.canvas;
    if (!canvas) return;

    const toLocal = (evt: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
    };

    canvas.addEventListener('mousedown', (evt) => {
      if (this.stateMachine.getState() !== 'Playing' || !this.loaded || !this.currentProjectile) return;
      const point = toLocal(evt);
      const radius = anchorRadiusFor(this.loaded.stage);
      if (!isWithinAnchorRadius(point, this.loaded.slingAnchor, radius)) return;
      this.dragOrigin = point;
    });

    canvas.addEventListener('mousemove', (evt) => {
      if (!this.dragOrigin || !this.loaded) return;
      const point = toLocal(evt);
      const drag: DragVector = { dx: point.x - this.dragOrigin.x, dy: point.y - this.dragOrigin.y };
      const launch = dragToLaunchVector(drag);
      this.lastTrajectoryPoints = predictTrajectory(
        this.loaded.slingAnchor,
        launch,
        this.adapter.engine.gravity.y,
        this.adapter.engine.gravity.scale
      );
    });

    canvas.addEventListener('mouseup', (evt) => {
      if (!this.dragOrigin || !this.loaded || !this.currentProjectile) return;
      const point = toLocal(evt);
      const drag: DragVector = { dx: point.x - this.dragOrigin.x, dy: point.y - this.dragOrigin.y };
      const launch = dragToLaunchVector(drag);
      launchProjectile(this.adapter, this.currentProjectile, launch);
      consumeProjectile(this.loaded);
      this.hud?.update(this.loaded.projectilesRemaining);
      this.currentProjectile = null;
      this.dragOrigin = null;
      this.lastTrajectoryPoints = [];
      this.checkOutcomeSoon();
    });
  }

  private setupTrajectoryOverlay(): void {
    if (!this.render) return;
    Matter.Events.on(this.render, 'afterRender', () => {
      if (!this.render || this.lastTrajectoryPoints.length === 0) return;
      const ctx = this.render.context;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      this.lastTrajectoryPoints.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.restore();
    });
  }

  private spawnNextProjectile(): void {
    if (!this.loaded) return;
    if (this.loaded.projectilesRemaining <= 0) return;
    this.currentProjectile = spawnProjectileAtAnchor(this.loaded.slingAnchor);
    this.adapter.addBody(this.currentProjectile);
  }

  private onCollisionOutcome(): void {
    // 로드베어링 hop5: pigs 배열 길이 체크가 매 충돌 이후 실행된다.
    this.checkOutcomeSoon();
  }

  private checkOutcomeSoon(): void {
    if (!this.loaded) return;
    const outcome = evaluateOutcome(this.loaded);
    if (outcome.type === 'cleared') {
      this.stateMachine.dispatch({ type: 'CLEARED' });
      return;
    }
    if (outcome.type === 'failed') {
      this.stateMachine.dispatch({ type: 'FAILED' });
      return;
    }
    if (!this.currentProjectile) {
      this.spawnNextProjectile();
    }
  }

  private showPauseOverlay(): void {
    this.pauseOverlay = new PauseOverlay(this.root, {
      onRestart: () => this.stateMachine.dispatch({ type: 'RESTART' }),
      onMainMenu: () => this.stateMachine.dispatch({ type: 'MAIN_MENU' }),
    });
  }
}
