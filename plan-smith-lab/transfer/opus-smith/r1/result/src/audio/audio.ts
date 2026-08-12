export class Audio {
  private context: AudioContext
  private isMuted = false
  private activeVoices = 0
  private maxVoices = 8

  constructor() {
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)()
  }

  playLaunchSound() {
    if (this.isMuted || this.activeVoices >= this.maxVoices) return
    this.playTone(400, 100)
  }

  playImpactSound() {
    if (this.isMuted || this.activeVoices >= this.maxVoices) return
    this.playTone(600, 80)
  }

  playBlockBreak() {
    if (this.isMuted || this.activeVoices >= this.maxVoices) return
    this.playTone(800, 100)
  }

  playPigKill() {
    if (this.isMuted || this.activeVoices >= this.maxVoices) return
    this.playTone(300, 200)
  }

  playClear() {
    if (this.isMuted || this.activeVoices >= this.maxVoices) return
    this.playTone(1000, 300)
  }

  toggleMute() {
    this.isMuted = !this.isMuted
    try {
      localStorage.setItem('audio_muted', String(this.isMuted))
    } catch (e) {}
  }

  isMutedState(): boolean {
    return this.isMuted
  }

  private playTone(frequency: number, duration: number) {
    try {
      this.activeVoices++
      const osc = this.context.createOscillator()
      const gain = this.context.createGain()

      osc.connect(gain)
      gain.connect(this.context.destination)

      osc.frequency.value = frequency
      gain.gain.setValueAtTime(0.3, this.context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration / 1000)

      osc.start(this.context.currentTime)
      osc.stop(this.context.currentTime + duration / 1000)

      setTimeout(() => {
        this.activeVoices = Math.max(0, this.activeVoices - 1)
      }, duration)
    } catch (e) {
      this.activeVoices = Math.max(0, this.activeVoices - 1)
    }
  }
}
