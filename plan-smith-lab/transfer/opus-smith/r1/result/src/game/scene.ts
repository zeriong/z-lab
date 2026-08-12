import { Body, World as MatterWorld, Events } from 'matter-js'
import { App } from '../app'
import { createWorld, getWorld } from '../physics/world'
import { StageDef } from '../data/schema'
import { loadStage, createStageWorld } from '../data/loader'
import { DamageSystem } from './damage'
import { SettleJudge } from './settle'
import { ScoreManager } from './score'
import { SlingshotController } from './slingshot'

export class GameScene {
  private stageNum: number
  private app: App
  private stageDef: StageDef | null = null
  private world: MatterWorld | null = null
  private damageSystem = new DamageSystem()
  private settleJudge = new SettleJudge()
  private scoreManager = new ScoreManager()
  private slingshot: SlingshotController | null = null
  private birds: Body[] = []
  private pigBodies: Body[] = []
  private currentBirdIndex = 0
  private pigsRemaining = 0
  private isLoaded = false
  private gameLoopId: NodeJS.Timeout | null = null

  constructor(stageNum: number, app: App) {
    this.stageNum = stageNum
    this.app = app
  }

  async mount() {
    this.world = createWorld()
    this.stageDef = await loadStage(this.stageNum)

    if (!this.world || !this.stageDef) return

    // Create stage world
    const pigBodies = createStageWorld(this.stageDef, this.world, this.damageSystem)
    this.pigBodies = pigBodies
    this.pigsRemaining = pigBodies.length

    // Initialize score
    this.scoreManager.reset(this.stageDef.birds.length)

    // Create birds
    const renderer = this.app.getRenderer()
    this.birds = this.createBirds(this.stageDef.birds, this.stageDef.slingshot)
    this.world.bodies.push(...this.birds)

    // Setup slingshot
    this.slingshot = new SlingshotController(this.stageDef.slingshot, renderer)

    // Load first bird
    this.reloadBird()

    // Setup damage system callbacks
    this.damageSystem.setBlockDestroyCallback((body) => {
      this.scoreManager.addBlockBreak()
      renderer.addShake(3, 0.15)
    })

    this.damageSystem.setPigDestroyCallback((body, isBoss) => {
      if (isBoss) {
        this.scoreManager.addBossKill()
      } else {
        this.scoreManager.addPigKill()
      }
      this.pigsRemaining--
      renderer.addShake(5, 0.2)
    })

    this.damageSystem.setTNTExplodeCallback((x, y) => {
      this.scoreManager.addTNTExplosion()
      renderer.addShake(8, 0.3)
    })

    // Setup collision listener
    Events.on(this.world, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        this.damageSystem.applyDamage(pair, this.world!)
      }
    })

    // Start game loop
    this.startGameLoop()
    this.isLoaded = true
  }

  unmount() {
    if (this.gameLoopId) {
      clearInterval(this.gameLoopId)
    }
    if (this.world) {
      Events.removeAllListeners(this.world)
    }
    this.isLoaded = false
    this.birds = []
    this.pigBodies = []
  }

  private createBirds(types: string[], slingshot: { x: number; y: number }): Body[] {
    const { Bodies } = require('matter-js')
    const birds: Body[] = []

    for (const type of types) {
      const bird = Bodies.circle(slingshot.x, slingshot.y, 12)
      bird.isStatic = true
      bird.plugin = { type, color: '#FF6B6B' }
      birds.push(bird)
    }

    return birds
  }

  private reloadBird() {
    if (this.currentBirdIndex >= this.birds.length) return

    const bird = this.birds[this.currentBirdIndex]
    const slingshot = this.stageDef!.slingshot
    bird.position.x = slingshot.x
    bird.position.y = slingshot.y
    bird.isStatic = true
    Body.setVelocity(bird, { x: 0, y: 0 })

    this.slingshot?.setCurrentBird(bird)
  }

  private startGameLoop() {
    this.gameLoopId = setInterval(() => {
      if (!this.isLoaded) return

      // Update settle judge
      if (this.world) {
        this.settleJudge.update(this.world.bodies, 16.667 / 1000)
      }

      // Check if current bird launched
      const currentBird = this.birds[this.currentBirdIndex]
      if (currentBird && !currentBird.isStatic) {
        this.settleJudge.startFlight()
      }

      // Check settle
      if (this.settleJudge.isSettled()) {
        this.settleJudge.reset()

        if (this.pigsRemaining === 0) {
          this.app.dispatch('CLEAR')
        } else if (this.currentBirdIndex >= this.birds.length - 1) {
          this.app.dispatch('FAIL')
        } else {
          this.currentBirdIndex++
          this.reloadBird()
        }
      }
    }, 16.667)
  }

  getPigsRemaining(): number {
    return this.pigsRemaining
  }

  getScoreManager(): ScoreManager {
    return this.scoreManager
  }

  getStageDef(): StageDef | null {
    return this.stageDef
  }

  getStageNum(): number {
    return this.stageNum
  }
}
