const CHANNEL_LIMIT = 8;
const SAMPLE_RATE = 44100;

export type SoundEffect = 'launch' | 'impact' | 'break' | 'pig' | 'clear';

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private activeVoices: OscillatorNode[] = [];
  private masterVolume: GainNode | null = null;
  private enabled: boolean = true;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.audioContext = audioContext;

      this.masterVolume = audioContext.createGain();
      this.masterVolume.connect(audioContext.destination);
      this.masterVolume.gain.value = this.enabled ? 1 : 0;
    } catch (e) {
      console.error('Failed to initialize AudioContext:', e);
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
    if (!this.audioContext || !this.masterVolume || !this.enabled) return;

    // Limit concurrent voices
    if (this.activeVoices.length >= CHANNEL_LIMIT) {
      const oldVoice = this.activeVoices.shift();
      if (oldVoice) {
        oldVoice.stop();
      }
    }

    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.frequency.value = frequency;
    osc.type = type;
    osc.connect(gain);
    gain.connect(this.masterVolume);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.start(now);
    osc.stop(now + duration);

    this.activeVoices.push(osc);
  }

  playSound(effect: SoundEffect): void {
    switch (effect) {
      case 'launch':
        this.playTone(200, 0.1);
        this.playTone(300, 0.15, 'triangle');
        break;
      case 'impact':
        this.playTone(800, 0.05);
        this.playTone(500, 0.08);
        break;
      case 'break':
        this.playTone(1200, 0.1, 'square');
        this.playTone(900, 0.15);
        break;
      case 'pig':
        this.playTone(150, 0.2);
        this.playTone(100, 0.25);
        break;
      case 'clear':
        this.playTone(600, 0.1);
        this.playTone(800, 0.1);
        this.playTone(1000, 0.2);
        break;
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.masterVolume) {
      this.masterVolume.gain.value = enabled ? 1 : 0;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  stopAll(): void {
    for (const voice of this.activeVoices) {
      try {
        voice.stop();
      } catch (e) {
        // Already stopped
      }
    }
    this.activeVoices = [];
  }
}
