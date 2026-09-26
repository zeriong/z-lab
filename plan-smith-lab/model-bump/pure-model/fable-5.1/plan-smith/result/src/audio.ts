// B10: Web Audio 합성 효과음 + BGM 루프. 모든 호출은 try/catch — 오디오 실패는 무음일 뿐 루프를 죽이지 않는다(§8).
export type SfxName = 'stretch' | 'launch' | 'hit' | 'break' | 'pig' | 'clear' | 'fail' | 'click';
export type BgmKind = 'main' | 'game';

type OscType = OscillatorType;

interface BgmHandle {
  kind: BgmKind;
  gain: GainNode;
  timer: ReturnType<typeof setInterval>;
}

const BGM_PATTERNS: Record<BgmKind, { notes: number[]; beatMs: number; type: OscType; gain: number }> = {
  main: { notes: [262, 330, 392, 523, 392, 330, 294, 349], beatMs: 320, type: 'triangle', gain: 0.05 },
  game: { notes: [196, 247, 294, 392, 294, 247, 220, 262], beatMs: 260, type: 'sine', gain: 0.045 },
};

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bgm: BgmHandle | null = null;
  private _muted = false;

  constructor(private readonly factory: () => AudioContext = () => new AudioContext()) {}

  get muted(): boolean {
    return this._muted;
  }

  get unlocked(): boolean {
    return this.ctx !== null;
  }

  /** 마스터 gain 값. 컨텍스트가 없으면 muted 여부로 계산한 값. */
  get masterGain(): number {
    return this.master ? this.master.gain.value : this._muted ? 0 : 1;
  }

  /** 첫 사용자 제스처(pointerdown)에서 호출. 자동재생 정책 때문에 그 전엔 컨텍스트를 만들지 않는다. */
  unlock(): void {
    try {
      if (!this.ctx) {
        this.ctx = this.factory();
        this.master = this.ctx.createGain();
        this.master.gain.value = this._muted ? 0 : 1;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => undefined);
      }
    } catch {
      this.ctx = null;
      this.master = null;
    }
  }

  setMuted(muted: boolean): void {
    this._muted = muted;
    try {
      if (this.master) this.master.gain.value = muted ? 0 : 1;
    } catch {
      // 무음
    }
  }

  toggleMuted(): boolean {
    this.setMuted(!this._muted);
    return this._muted;
  }

  private tone(
    f0: number,
    f1: number,
    durSec: number,
    type: OscType,
    gain: number,
    delaySec = 0,
  ): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + durSec);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + durSec);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + durSec + 0.02);
  }

  play(name: SfxName): void {
    try {
      switch (name) {
        case 'stretch':
          this.tone(180, 240, 0.08, 'sine', 0.08);
          break;
        case 'launch':
          this.tone(320, 900, 0.18, 'sawtooth', 0.12);
          break;
        case 'hit':
          this.tone(140, 80, 0.07, 'square', 0.06);
          break;
        case 'break':
          this.tone(220, 40, 0.22, 'triangle', 0.14);
          this.tone(90, 30, 0.18, 'square', 0.06, 0.02);
          break;
        case 'pig':
          this.tone(700, 180, 0.28, 'sine', 0.16);
          this.tone(260, 120, 0.2, 'triangle', 0.08, 0.05);
          break;
        case 'clear':
          this.tone(523, 523, 0.14, 'triangle', 0.12, 0);
          this.tone(659, 659, 0.14, 'triangle', 0.12, 0.15);
          this.tone(784, 784, 0.28, 'triangle', 0.14, 0.3);
          break;
        case 'fail':
          this.tone(392, 392, 0.2, 'sawtooth', 0.1, 0);
          this.tone(311, 311, 0.2, 'sawtooth', 0.1, 0.22);
          this.tone(233, 200, 0.4, 'sawtooth', 0.1, 0.44);
          break;
        case 'click':
          this.tone(900, 700, 0.05, 'square', 0.04);
          break;
        default:
          break;
      }
    } catch {
      // 무음
    }
  }

  startBgm(kind: BgmKind): void {
    try {
      if (this.bgm && this.bgm.kind === kind) return;
      this.stopBgm();
      if (!this.ctx || !this.master) return;
      const ctx = this.ctx;
      const pattern = BGM_PATTERNS[kind];
      const gain = ctx.createGain();
      gain.gain.value = 1;
      gain.connect(this.master);
      let i = 0;
      const playNote = () => {
        try {
          const f = pattern.notes[i % pattern.notes.length] ?? 262;
          i += 1;
          const t0 = ctx.currentTime;
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = pattern.type;
          osc.frequency.setValueAtTime(f, t0);
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.linearRampToValueAtTime(pattern.gain, t0 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + pattern.beatMs / 1000);
          osc.connect(g);
          g.connect(gain);
          osc.start(t0);
          osc.stop(t0 + pattern.beatMs / 1000 + 0.02);
        } catch {
          // 무음
        }
      };
      playNote();
      const timer = setInterval(playNote, pattern.beatMs);
      this.bgm = { kind, gain, timer };
    } catch {
      this.bgm = null;
    }
  }

  stopBgm(): void {
    if (!this.bgm) return;
    try {
      clearInterval(this.bgm.timer);
      this.bgm.gain.disconnect();
    } catch {
      // 무음
    } finally {
      this.bgm = null;
    }
  }
}
