// 사운드 (M23) — WebAudio 합성음. 외부 에셋 0 (N1).
// AudioContext는 첫 사용자 제스처에서 unlock된다 (브라우저 자동재생 정책).

import type { Material } from './types';

let ctx: AudioContext | null = null;
let lastHitAt = 0;

export function unlock(): void {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null; // WebAudio 불가 환경 — 무음으로 진행
  }
}

function tone(f0: number, f1: number, dur: number, type: OscillatorType, vol: number): void {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(Math.max(f0, 1), t);
  o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(t);
  o.stop(t + dur);
}

function noiseBurst(dur: number, vol: number, cutoff: number): void {
  if (!ctx) return;
  const frames = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = cutoff;
  const g = ctx.createGain();
  const t = ctx.currentTime;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(ctx.destination);
  src.start(t);
  src.stop(t + dur);
}

/** 발사 휘익 */
export function playLaunch(): void {
  tone(250, 700, 0.18, 'triangle', 0.25);
}

/** 충돌 퉁 — 다중 충돌 소음 방지를 위해 70ms 스로틀 */
export function playHit(severity: number): void {
  const now = performance.now();
  if (now - lastHitAt < 70) return;
  lastHitAt = now;
  tone(160, 60, 0.09, 'sine', Math.min(0.3, 0.08 + severity * 0.01));
}

/** 블록 파괴 — 재료별 필터 컷오프 */
export function playBreak(material: Material): void {
  noiseBurst(0.18, 0.3, material === 'stone' ? 400 : material === 'wood' ? 900 : 2200);
}

/** 돼지 제거 팝 */
export function playPig(): void {
  tone(500, 90, 0.25, 'square', 0.2);
}

/** 클리어 팡파르 */
export function playClear(): void {
  const notes = [523, 659, 784];
  notes.forEach((f, i) => {
    window.setTimeout(() => tone(f, f, 0.18, 'triangle', 0.25), i * 140);
  });
}

/** 실패 */
export function playFail(): void {
  tone(300, 120, 0.5, 'sawtooth', 0.2);
}
