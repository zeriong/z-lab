import { App } from '../app'

export class HUD {
  private app: App
  private hudContainer: HTMLDivElement
  private scoreDisplay: HTMLDivElement
  private birdsDisplay: HTMLDivElement
  private pauseButton: HTMLButtonElement

  constructor(app: App) {
    this.app = app

    this.hudContainer = document.createElement('div')
    this.hudContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 80px;
      background: rgba(0, 0, 0, 0.3);
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 20px;
      box-sizing: border-box;
      color: white;
      font-size: 24px;
      font-weight: bold;
      z-index: 10;
      pointer-events: none;
    `

    this.scoreDisplay = document.createElement('div')
    this.scoreDisplay.style.cssText = `
      flex: 1;
      text-align: left;
    `
    this.scoreDisplay.textContent = 'Score: 0'

    this.birdsDisplay = document.createElement('div')
    this.birdsDisplay.style.cssText = `
      flex: 1;
      text-align: center;
    `
    this.birdsDisplay.textContent = 'Birds: 0'

    this.pauseButton = document.createElement('button')
    this.pauseButton.textContent = '⏸'
    this.pauseButton.style.cssText = `
      flex: 1;
      text-align: right;
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
      margin-left: auto;
    `

    this.pauseButton.addEventListener('click', () => {
      this.app.dispatch('PAUSE')
    })

    this.hudContainer.appendChild(this.scoreDisplay)
    this.hudContainer.appendChild(this.birdsDisplay)
    this.hudContainer.appendChild(this.pauseButton)

    document.body.appendChild(this.hudContainer)
  }

  update(score: number, remainingBirds: number) {
    this.scoreDisplay.textContent = `Score: ${score}`
    this.birdsDisplay.textContent = `Birds: ${remainingBirds}`
  }

  hide() {
    this.hudContainer.style.display = 'none'
  }

  show() {
    this.hudContainer.style.display = 'flex'
  }

  remove() {
    this.hudContainer.remove()
  }
}
