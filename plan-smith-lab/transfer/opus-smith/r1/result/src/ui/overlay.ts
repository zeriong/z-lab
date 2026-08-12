import { App } from '../app'
import { isStageUnlocked, getTotalStars } from '../storage/progress'

export class OverlayLayer {
  private app: App
  private container: HTMLDivElement
  private currentOverlay: string = 'boot'

  constructor(app: App) {
    this.app = app
    this.container = document.createElement('div')
    this.container.id = 'overlay-container'
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 100;
    `
    document.body.appendChild(this.container)

    this.addStyleSheet()
  }

  private addStyleSheet() {
    const style = document.createElement('style')
    style.textContent = `
      #overlay-container {
        font-family: Arial, sans-serif;
      }

      .overlay-content {
        pointer-events: auto;
      }

      .overlay-bg {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 101;
      }

      .overlay-box {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 40px;
        border-radius: 8px;
        text-align: center;
        z-index: 102;
      }

      .overlay-box h1 {
        margin: 0 0 20px 0;
        font-size: 32px;
      }

      .overlay-box button {
        background: #4CAF50;
        color: white;
        border: none;
        padding: 12px 24px;
        margin: 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
      }

      .overlay-box button:hover {
        background: #45a049;
      }

      .stage-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 12px;
        margin: 20px 0;
      }

      .stage-button {
        aspect-ratio: 1;
        border: 2px solid #333;
        background: #f0f0f0;
        border-radius: 8px;
        cursor: pointer;
        font-size: 20px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
      }

      .stage-button:hover {
        background: #e0e0e0;
      }

      .stage-button.locked {
        background: #ccc;
        cursor: not-allowed;
        opacity: 0.5;
      }

      .stage-button.locked:hover {
        background: #ccc;
      }

      .stage-stars {
        font-size: 12px;
        margin-top: 4px;
      }

      .progress-bar {
        text-align: left;
        margin: 20px 0;
      }

      .pause-button {
        position: fixed;
        top: 10px;
        right: 10px;
        width: 44px;
        height: 44px;
        background: #ff6b6b;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        color: white;
        font-size: 20px;
        font-weight: bold;
        pointer-events: auto;
        z-index: 50;
      }

      .pause-button:hover {
        background: #ff5252;
      }
    `
    document.head.appendChild(style)
  }

  showMenu() {
    this.clearOverlay()
    this.currentOverlay = 'menu'

    const content = document.createElement('div')
    content.className = 'overlay-content overlay-box'
    content.innerHTML = `
      <h1>Angry Birds</h1>
      <p>Launch birds to destroy pigs and structures</p>
      <button id="start-btn">Start Game</button>
    `

    this.container.appendChild(content)
    document.getElementById('start-btn')?.addEventListener('click', () => {
      this.app.dispatch('START')
    })
  }

  showStageSelect() {
    this.clearOverlay()
    this.currentOverlay = 'stage-select'

    const content = document.createElement('div')
    content.className = 'overlay-content overlay-box'

    const totalStars = getTotalStars()
    content.innerHTML = `
      <h1>Stage Select</h1>
      <div class="progress-bar">Total Stars: ★ ${totalStars} / 30</div>
      <div class="stage-grid" id="stage-grid"></div>
      <button id="back-btn">Back</button>
    `

    this.container.appendChild(content)

    const grid = document.getElementById('stage-grid')
    for (let i = 1; i <= 10; i++) {
      const unlocked = isStageUnlocked(i)
      const btn = document.createElement('button')
      btn.className = `stage-button ${!unlocked ? 'locked' : ''}`
      btn.textContent = String(i)
      if (!unlocked) {
        btn.disabled = true
      } else {
        btn.addEventListener('click', () => {
          this.app.dispatch('SELECT', i)
        })
      }
      grid?.appendChild(btn)
    }

    document.getElementById('back-btn')?.addEventListener('click', () => {
      this.app.dispatch('BACK')
    })
  }

  showPause() {
    if (this.currentOverlay === 'pause') return
    this.currentOverlay = 'pause'

    const bg = document.createElement('div')
    bg.className = 'overlay-bg'

    const box = document.createElement('div')
    box.className = 'overlay-box'
    box.innerHTML = `
      <h1>Paused</h1>
      <button id="resume-btn">Continue</button>
      <button id="retry-btn">Retry</button>
      <button id="menu-btn">Menu</button>
    `

    this.container.appendChild(bg)
    this.container.appendChild(box)

    document.getElementById('resume-btn')?.addEventListener('click', () => {
      this.app.dispatch('RESUME')
    })
    document.getElementById('retry-btn')?.addEventListener('click', () => {
      this.app.dispatch('RETRY')
    })
    document.getElementById('menu-btn')?.addEventListener('click', () => {
      this.app.dispatch('MENU')
    })
  }

  showClear(stageNum: number) {
    if (this.currentOverlay === 'clear') return
    this.currentOverlay = 'clear'

    const gameScene = this.app.getGameScene()
    const score = gameScene?.getScoreManager().getScore() || 0
    const targetScore = gameScene?.getStageDef()?.targetScore || 0
    const stars = gameScene?.getScoreManager().getStars(targetScore) || 0
    const nextStage = Math.min(stageNum + 1, 10)

    const bg = document.createElement('div')
    bg.className = 'overlay-bg'

    const box = document.createElement('div')
    box.className = 'overlay-box'
    box.innerHTML = `
      <h1>Stage Clear!</h1>
      <p>Score: ${score}</p>
      <p>Stars: ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</p>
      ${stageNum < 10 ? `<button id="next-btn">Next Stage</button>` : ''}
      <button id="retry-btn">Retry</button>
      <button id="menu-btn">Menu</button>
    `

    this.container.appendChild(bg)
    this.container.appendChild(box)

    if (stageNum < 10) {
      document.getElementById('next-btn')?.addEventListener('click', () => {
        this.app.dispatch('NEXT')
      })
    }
    document.getElementById('retry-btn')?.addEventListener('click', () => {
      this.app.dispatch('RETRY')
    })
    document.getElementById('menu-btn')?.addEventListener('click', () => {
      this.app.dispatch('MENU')
    })
  }

  showFail() {
    if (this.currentOverlay === 'fail') return
    this.currentOverlay = 'fail'

    const bg = document.createElement('div')
    bg.className = 'overlay-bg'

    const box = document.createElement('div')
    box.className = 'overlay-box'
    box.innerHTML = `
      <h1>Out of Birds!</h1>
      <button id="retry-btn">Retry</button>
      <button id="menu-btn">Menu</button>
    `

    this.container.appendChild(bg)
    this.container.appendChild(box)

    document.getElementById('retry-btn')?.addEventListener('click', () => {
      this.app.dispatch('RETRY')
    })
    document.getElementById('menu-btn')?.addEventListener('click', () => {
      this.app.dispatch('MENU')
    })
  }

  hideOverlay() {
    this.clearOverlay()
    this.currentOverlay = 'none'
  }

  private clearOverlay() {
    this.container.innerHTML = ''
  }

  addPauseButton() {
    // This will be added by HUD
  }
}
