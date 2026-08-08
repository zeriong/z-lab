// 효과음 (L22) — Web Audio 오실레이터 합성 4종, 파일 자산 불필요.
// 첫 사용자 입력에서 unlockAudio()로 AudioContext를 생성/재개한다(autoplay 차단 대응).

let ctx: AudioContext | null = null;

export function unlockAudio(): void {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null; // 오디오 불가 환경 — 무음으로 계속
  }
}

function tone(
  freqStart: number,
  freqEnd: number,
  dur: number,
  type: OscillatorType,
  vol: number,
  delay = 0,
): void {
  if (!ctx || ctx.state !== 'running') return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(freqStart, 1), t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  /** 발사 — 슉 하는 하강 스윕 */
  shoot(): void {
    tone(600, 180, 0.25, 'triangle', 0.25);
  },
  /** 파괴 — 짧고 낮은 타격음 */
  smash(): void {
    tone(220, 60, 0.18, 'square', 0.2);
  },
  /** 클리어 — 상승 아르페지오 */
  clear(): void {
    tone(523, 523, 0.12, 'sine', 0.25, 0);
    tone(659, 659, 0.12, 'sine', 0.25, 0.12);
    tone(784, 784, 0.22, 'sine', 0.25, 0.24);
  },
  /** 실패 — 하강 톤 */
  fail(): void {
    tone(300, 110, 0.5, 'sawtooth', 0.18);
  },
};
