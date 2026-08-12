export class AudioManager {
  private audioContext: AudioContext | null = null;
  private oscillators: OscillatorNode[] = [];
  private maxChannels = 8;
  private channelIndex = 0;
  private isMuted = false;

  constructor() {
    this.initAudio();
    this.loadMuteState();
  }

  private initAudio(): void {
    if (typeof window !== 'undefined' && window.AudioContext) {
      this.audioContext = new window.AudioContext();
    }
  }

  private loadMuteState(): void {
    try {
      const stored = localStorage.getItem('audio_muted');
      this.isMuted = stored === 'true';
    } catch {
      this.isMuted = false;
    }
  }

  toggleMute(): void {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('audio_muted', String(this.isMuted));
    } catch {
      // localStorage not available
    }
  }

  playSound(type: 'launch' | 'hit' | 'destroy' | 'pig' | 'clear'): void {
    if (this.isMuted || !this.audioContext) return;

    let freq = 440;
    let duration = 0.1;

    switch (type) {
      case 'launch':
        freq = 300;
        duration = 0.15;
        break;
      case 'hit':
        freq = 600;
        duration = 0.08;
        break;
      case 'destroy':
        freq = 800;
        duration = 0.1;
        break;
      case 'pig':
        freq = 200;
        duration = 0.2;
        break;
      case 'clear':
        freq = 1200;
        duration = 0.3;
        break;
    }

    this.playTone(freq, duration);
  }

  private playTone(frequency: number, duration: number): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.frequency.value = frequency;
    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.start(now);
    osc.stop(now + duration);

    this.channelIndex = (this.channelIndex + 1) % this.maxChannels;
  }

  isMutedState(): boolean {
    return this.isMuted;
  }
}
