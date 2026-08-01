/**
 * 오디오 (R5). WebAudio 합성음만 사용 — 외부 에셋 없음(§1-B R10 "외부 아트 에셋: 해당없음"과 같은 이유).
 * 일시정지 시 AudioContext.suspend() 한 번으로 예약된 소리까지 전부 멈춘다(플랜 §3).
 */

export type SfxName =
  | 'ui'
  | 'launch'
  | 'hit'
  | 'break'
  | 'pig'
  | 'dash'
  | 'clear'
  | 'fail';

export class AudioBus {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private muted: boolean;

  constructor(muted: boolean) {
    this.muted = muted;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** 브라우저 자동재생 정책: 첫 사용자 제스처에서 호출 */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended' && !this.muted) void this.ctx.resume();
      return;
    }
    type Ctor = typeof AudioContext;
    const w = window as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
    const Ctx = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.85;
    master.connect(ctx.destination);
    const music = ctx.createGain();
    music.gain.value = 0.16;
    music.connect(master);
    this.ctx = ctx;
    this.master = master;
    this.musicGain = music;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.85, this.ctx.currentTime, 0.02);
    }
    if (!muted) this.resume();
  }

  /** PAUSED 진입 시 — 물리 정지와 같은 지점에서 호출된다(플랜 §9 리스크 완화) */
  suspend(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended' && !this.muted) void this.ctx.resume();
  }

  // ---------- 효과음 ----------

  play(name: SfxName): void {
    if (this.muted) return;
    this.unlock();
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    if (ctx.state === 'suspended') return; // 일시정지 중에는 새 소리를 쌓지 않는다

    const t = ctx.currentTime;
    switch (name) {
      case 'ui':
        this.blip(t, 660, 0.06, 0.18, 'square');
        break;
      case 'launch':
        this.sweep(t, 720, 180, 0.22, 0.3, 'sawtooth');
        break;
      case 'hit':
        this.noise(t, 0.07, 900, 0.22);
        break;
      case 'break':
        this.noise(t, 0.22, 2200, 0.32);
        this.blip(t + 0.01, 210, 0.12, 0.18, 'triangle');
        break;
      case 'pig':
        this.blip(t, 320, 0.1, 0.3, 'square');
        this.blip(t + 0.09, 200, 0.16, 0.26, 'sawtooth');
        break;
      case 'dash':
        this.sweep(t, 300, 1400, 0.16, 0.24, 'triangle');
        break;
      case 'clear':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          this.blip(t + i * 0.11, f, 0.18, 0.26, 'triangle');
        });
        break;
      case 'fail':
        [392, 329.63, 261.63].forEach((f, i) => {
          this.blip(t + i * 0.14, f, 0.24, 0.24, 'sawtooth');
        });
        break;
    }
  }

  /** 충격 세기에 따라 소리 크기를 바꾸는 충돌음 */
  playImpact(strength: number): void {
    if (this.muted) return;
    const clamped = Math.max(0.1, Math.min(1, strength / 120));
    this.unlock();
    const ctx = this.ctx;
    if (!ctx || ctx.state === 'suspended') return;
    this.noise(ctx.currentTime, 0.05 + clamped * 0.08, 700 + clamped * 1600, 0.1 + clamped * 0.25);
  }

  // ---------- 배경음 (단순 루프 1개) ----------

  startMusic(): void {
    this.unlock();
    if (!this.ctx || !this.musicGain || this.muted) return;
    if (this.musicTimer !== null) return;
    this.resume();
    this.musicStep = 0;
    const notes = [196, 246.94, 293.66, 246.94, 220, 261.63, 329.63, 261.63];
    const tick = () => {
      const ctx = this.ctx;
      const out = this.musicGain;
      if (!ctx || !out || this.muted || ctx.state !== 'running') return;
      const f = notes[this.musicStep % notes.length];
      this.musicStep += 1;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.42);
      osc.connect(g);
      g.connect(out);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.45);
    };
    tick();
    this.musicTimer = window.setInterval(tick, 460);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  // ---------- 합성 프리미티브 ----------

  private blip(at: number, freq: number, dur: number, gain: number, type: OscillatorType): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  private sweep(
    at: number,
    from: number,
    to: number,
    dur: number,
    gain: number,
    type: OscillatorType,
  ): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  private noise(at: number, dur: number, cutoff: number, gain: number): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const frames = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    // 노이즈도 결정적으로: 위상만 다른 고정 시퀀스
    let seed = 12345;
    for (let i = 0; i < frames; i += 1) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const v = (seed / 0x7fffffff) * 2 - 1;
      data[i] = v * (1 - i / frames);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = cutoff;
    filter.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(at);
  }
}
