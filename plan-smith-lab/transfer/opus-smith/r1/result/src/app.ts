import { CanvasRenderer } from './render/canvas'
import { PhysicsLoop } from './physics/loop'
import { createWorld, disposeWorld } from './physics/world'
import { OverlayLayer } from './ui/overlay'
import { GameScene } from './game/scene'
import { Audio } from './audio/audio'
import { HUD } from './ui/hud'
import { loadProgress } from './storage/progress'

export type Phase = 'BOOT' | 'MENU' | 'STAGE_SELECT' | 'PLAYING' | 'PAUSED' | 'CLEARED' | 'FAILED'
export type Event = 'START' | 'SELECT' | 'BACK' | 'PAUSE' | 'RESUME' | 'RETRY' | 'NEXT' | 'MENU' | 'CLEAR' | 'FAIL'

const transitionTable: Record<Phase, Partial<Record<Event, Phase>>> = {
  BOOT: { START: 'MENU' },
  MENU: { START: 'STAGE_SELECT' },
  STAGE_SELECT: { SELECT: 'PLAYING', BACK: 'MENU' },
  PLAYING: { PAUSE: 'PAUSED', CLEAR: 'CLEARED', FAIL: 'FAILED' },
  PAUSED: { RESUME: 'PLAYING', RETRY: 'PLAYING', MENU: 'MENU' },
  CLEARED: { NEXT: 'PLAYING', RETRY: 'PLAYING', MENU: 'MENU' },
  FAILED: { RETRY: 'PLAYING', MENU: 'MENU' }
}

export class App {
  private phase: Phase = 'BOOT'
  private selectedStage: number = 1
  private renderer: CanvasRenderer
  private physicsLoop: PhysicsLoop
  private overlay: OverlayLayer
  private gameScene: GameScene | null = null
  private audio: Audio
  private hud: HUD | null = null
  private renderFrameId: number | null = null

  constructor() {
    this.renderer = new CanvasRenderer()
    this.physicsLoop = new PhysicsLoop()
    this.overlay = new OverlayLayer(this)
    this.audio = new Audio()
    loadProgress()
    this.startRenderLoop()
  }

  private startRenderLoop() {
    const render = () => {
      this.renderer.render(0)
      this.renderFrameId = requestAnimationFrame(render)
    }
    this.renderFrameId = requestAnimationFrame(render)
  }

  start() {
    this.dispatch('START')
  }

  dispatch(event: Event, stageNum?: number) {
    const nextPhase = transitionTable[this.phase][event]
    if (!nextPhase) return

    if (stageNum !== undefined) {
      this.selectedStage = stageNum
    }

    this.transitionTo(nextPhase)
  }

  private transitionTo(nextPhase: Phase) {
    // Exit current phase
    if (this.phase === 'PLAYING' || this.phase === 'PAUSED') {
      if (this.gameScene) {
        this.gameScene.unmount()
        this.gameScene = null
        disposeWorld()
      }
      this.physicsLoop.pause()
      if (this.hud) {
        this.hud.remove()
        this.hud = null
      }
    }

    this.phase = nextPhase

    // Enter next phase
    switch (nextPhase) {
      case 'BOOT':
        break
      case 'MENU':
        this.overlay.showMenu()
        break
      case 'STAGE_SELECT':
        this.overlay.showStageSelect()
        break
      case 'PLAYING':
        this.startGame(this.selectedStage)
        this.overlay.hideOverlay()
        this.physicsLoop.play()
        break
      case 'PAUSED':
        this.physicsLoop.pause()
        this.overlay.showPause()
        break
      case 'CLEARED':
        this.physicsLoop.pause()
        this.overlay.showClear(this.selectedStage)
        break
      case 'FAILED':
        this.physicsLoop.pause()
        this.overlay.showFail()
        break
    }
  }

  private startGame(stageNum: number) {
    this.gameScene = new GameScene(stageNum, this)
    this.hud = new HUD(this)
    this.gameScene.mount()
  }

  getPhase(): Phase {
    return this.phase
  }

  getGameScene(): GameScene | null {
    return this.gameScene
  }

  getPhysicsLoop(): PhysicsLoop {
    return this.physicsLoop
  }

  getSelectedStage(): number {
    return this.selectedStage
  }

  getAudio(): Audio {
    return this.audio
  }

  getRenderer(): CanvasRenderer {
    return this.renderer
  }
}
