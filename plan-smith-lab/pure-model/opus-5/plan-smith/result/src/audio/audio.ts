/**
 * 효과음 5종 + 8채널 제한 + 음소거 (R4, R18).
 *
 * A4에 따라 외부 오디오 에셋 없이 WebAudio 합성음만 쓴다. A4가 틀리면
 * 이 클래스의 play()만 샘플 재생으로 바꾸면 되고, 호출부는 바뀌지 않는다.
 *
 * 8채널 제한이 필요한 이유: 대형 붕괴 한 번에 파괴 이벤트가 수십 개 발생한다.
 * 채널 제한이 없으면 출력이 클리핑되어 "찢어지는" 소리가 난다.
 */

export type SoundName = 'launch' | 'hit' | 'break' | 'pig' | 'clear' | 'fail' | 'explode';

const MAX_VOICES = 8;
/** 같은 소리가 이 간격 안에 다시 오면 무시한다(붕괴 프레임의 폭주 방지) */
const RETRIGGER_MS: Record<SoundName, number> = {
  launch: 0,
  hit: 40,
  break: 45,
  pig: 0,
  clear: 0,
  fail: 0,
  explode: 60,
};

interface Voice {
  gain: GainNode;
  endsAt: number;
}

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices: Voice[] = [];
  private lastPlayed: Partial<Record<SoundName, number>> = {};
  private muted = false;

  constructor(muted = false) {
    this.muted = muted;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.01);
    }
  }

  /**
   * 사용자 제스처 안에서 한 번 호출해야 한다(자동재생 정책).
   * 메인 메뉴의 "게임 시작" 클릭이 그 지점이다.
   */
  unlock(): void {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private ensure(): void {
    if (this.ctx) return;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return; // WebAudio 자체가 없는 환경 — 무음으로 계속 간다
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
      this.master = null;
    }
  }

  private freeVoice(now: number): boolean {
    this.voices = this.voices.filter((v) => v.endsAt > now);
    return this.voices.length < MAX_VOICES;
  }

  play(name: SoundName, intensity = 1): void {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx || !this.master) return;

    const nowMs = performance.now();
    const gap = RETRIGGER_MS[name];
    const last = this.lastPlayed[name] ?? -Infinity;
    if (gap > 0 && nowMs - last < gap) return;
    if (!this.freeVoice(this.ctx.currentTime)) return; // 8채널 초과 — 이번 소리는 버린다
    this.lastPlayed[name] = nowMs;

    const t = this.ctx.currentTime;
    const level = Math.max(0.05, Math.min(1, intensity));

    switch (name) {
      case 'launch':
        this.blip(t, 320, 620, 0.16, 'triangle', 0.35 * level);
        break;
      case 'hit':
        this.noise(t, 0.07, 0.3 * level, 1200);
        break;
      case 'break':
        this.noise(t, 0.16, 0.4 * level, 2400);
        this.blip(t, 220, 90, 0.16, 'square', 0.16 * level);
        break;
      case 'explode':
        this.noise(t, 0.42, 0.55 * level, 500);
        this.blip(t, 120, 40, 0.4, 'sawtooth', 0.3 * level);
        break;
      case 'pig':
        this.blip(t, 520, 180, 0.22, 'sawtooth', 0.3 * level);
        break;
      case 'clear':
        this.arpeggio(t, [523.25, 659.25, 783.99, 1046.5], 0.11, 0.28);
        break;
      case 'fail':
        this.arpeggio(t, [392, 349.23, 293.66, 196], 0.16, 0.24);
        break;
      default:
        break;
    }
  }

  private track(node: GainNode, endsAt: number): void {
    this.voices.push({ gain: node, endsAt });
  }

  private blip(
    t: number,
    fromHz: number,
    toHz: number,
    dur: number,
    type: OscillatorType,
    peak: number,
  ): void {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(fromHz, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, toHz), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    this.track(gain, t + dur);
  }

  private noise(t: number, dur: number, peak: number, cutoffHz: number): void {
    if (!this.ctx || !this.master) return;
    const frames = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) {
      channel[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoffHz;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(peak, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
    this.track(gain, t + dur);
  }

  private arpeggio(t: number, notes: number[], step: number, peak: number): void {
    notes.forEach((hz, i) => this.blip(t + i * step, hz, hz, step * 1.6, 'triangle', peak));
  }

  /** 씬 파기 시 호출 — 컨텍스트는 살려 두고 보유 목록만 비운다 */
  reset(): void {
    this.voices = [];
    this.lastPlayed = {};
  }
}
