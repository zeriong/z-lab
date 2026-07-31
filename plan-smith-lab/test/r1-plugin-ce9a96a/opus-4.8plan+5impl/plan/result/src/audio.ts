/**
 * 외부 오디오 파일 없이 WebAudio로 즉석 합성한다.
 * (애셋 404를 만들지 않기 위한 선택 — 완료 기준 "콘솔 에러 0건")
 * 최초 사용자 입력 시점에 컨텍스트를 만든다(autoplay 정책).
 */
class Sfx {
  private ctx: AudioContext | null = null;
  private enabled = true;

  private ensure(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) {
        this.enabled = false;
        return null;
      }
      this.ctx = new Ctor();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private blip(
    freqFrom: number,
    freqTo: number,
    duration: number,
    type: OscillatorType,
    gain: number,
  ): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqTo), now + duration);
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private noise(duration: number, gain: number, filterHz: number): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const frames = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterHz;
    const amp = ctx.createGain();
    amp.gain.value = gain;
    src.connect(filter).connect(amp).connect(ctx.destination);
    src.start(now);
  }

  unlock(): void {
    this.ensure();
  }
  launch(): void {
    this.blip(680, 180, 0.22, 'triangle', 0.16);
  }
  thud(strength: number): void {
    this.noise(0.09, Math.min(0.2, 0.03 + strength * 0.012), 260);
  }
  glass(): void {
    this.noise(0.22, 0.14, 2400);
  }
  woodBreak(): void {
    this.noise(0.16, 0.14, 700);
  }
  stoneBreak(): void {
    this.noise(0.2, 0.15, 380);
  }
  pigPop(): void {
    this.blip(420, 900, 0.16, 'square', 0.13);
    this.noise(0.14, 0.09, 1200);
  }
  clear(): void {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, f, 0.18, 'triangle', 0.13), i * 110));
  }
  fail(): void {
    [392, 330, 262].forEach((f, i) => setTimeout(() => this.blip(f, f * 0.9, 0.24, 'sawtooth', 0.1), i * 150));
  }
  click(): void {
    this.blip(880, 660, 0.06, 'square', 0.07);
  }
}

export const sfx = new Sfx();
