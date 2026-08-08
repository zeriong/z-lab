// B22 — 사운드(발사·충돌·파괴·제거·클리어) + 음소거
//
// 외부 오디오 에셋이 없으므로(가정 A4) WebAudio 로 합성한다.
// 자동재생 정책에 걸리지 않도록 첫 포인터 입력에서 resume() 한다.

export type SoundName = 'launch' | 'hit' | 'break' | 'pig' | 'clear' | 'fail' | 'ui';

interface Recipe {
  type: OscillatorType;
  freq: number;
  freqTo: number;
  dur: number;
  gain: number;
  noise?: boolean;
}

const RECIPES: Record<SoundName, Recipe> = {
  launch: { type: 'triangle', freq: 220, freqTo: 620, dur: 0.18, gain: 0.25 },
  hit: { type: 'square', freq: 180, freqTo: 90, dur: 0.08, gain: 0.16 },
  break: { type: 'sawtooth', freq: 320, freqTo: 60, dur: 0.26, gain: 0.22, noise: true },
  pig: { type: 'sine', freq: 520, freqTo: 140, dur: 0.3, gain: 0.3 },
  clear: { type: 'triangle', freq: 440, freqTo: 880, dur: 0.5, gain: 0.28 },
  fail: { type: 'sine', freq: 300, freqTo: 110, dur: 0.5, gain: 0.24 },
  ui: { type: 'square', freq: 660, freqTo: 660, dur: 0.05, gain: 0.12 },
};

class AudioBus {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  muted = false;
  ready = false;

  /** 부트 프리로드 단계에서 호출 — 컨텍스트 생성과 노이즈 버퍼 준비. */
  prepare(): void {
    if (this.ctx) return;
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) {
      this.ready = false;
      return;
    }
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);

    const len = Math.floor(this.ctx.sampleRate * 0.3);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    let seed = 1337;
    for (let i = 0; i < len; i++) {
      // 결정론적 의사난수 — 실행마다 같은 소리.
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      data[i] = (seed / 0x7fffffff) * 2 - 1;
    }
    this.noiseBuffer = buf;
    this.ready = true;
  }

  /** 첫 사용자 입력에서 호출. */
  unlock(): void {
    this.prepare();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(v: boolean): void {
    this.muted = v;
  }

  play(name: SoundName, intensity = 1): void {
    if (this.muted || !this.ctx || !this.master) return;
    const ctx = this.ctx;
    const r = RECIPES[name];
    const now = ctx.currentTime;
    const amp = Math.max(0.05, Math.min(1, intensity)) * r.gain;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(amp, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + r.dur);
    gain.connect(this.master);

    const osc = ctx.createOscillator();
    osc.type = r.type;
    osc.frequency.setValueAtTime(r.freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, r.freqTo), now + r.dur);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + r.dur);

    if (r.noise && this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(amp * 0.6, now);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + r.dur);
      src.connect(ng);
      ng.connect(this.master);
      src.start(now);
      src.stop(now + r.dur);
    }
  }
}

export const Audio = new AudioBus();
