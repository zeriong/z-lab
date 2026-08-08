import { loadProgress, setMuted } from "./progress";

/**
 * R23 오디오 SFX — build(thin). 바이너리 에셋 대신 WebAudio 오실레이터로 4종 SFX를
 * 합성한다(발사/충돌/제거/UI). R24(배경음악 루프)는 defer이므로 여기서 구현하지 않는다.
 */
export type SfxName = "launch" | "collision" | "pigRemoved" | "uiClick";

const SFX_FREQ: Record<SfxName, number> = {
  launch: 220,
  collision: 140,
  pigRemoved: 440,
  uiClick: 660
};

const SFX_DURATION_MS: Record<SfxName, number> = {
  launch: 120,
  collision: 90,
  pigRemoved: 180,
  uiClick: 60
};

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  if (!ctx) {
    ctx = new AudioCtor();
  }
  return ctx;
}

export function playSfx(name: SfxName): void {
  const progress = loadProgress();
  if (progress.muted) return;

  const audioCtx = getContext();
  if (!audioCtx) return;

  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = name === "collision" ? "square" : "sine";
  oscillator.frequency.value = SFX_FREQ[name];
  gain.gain.value = 0.15;

  oscillator.connect(gain);
  gain.connect(audioCtx.destination);

  const durationSec = SFX_DURATION_MS[name] / 1000;
  const now = audioCtx.currentTime;
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.linearRampToValueAtTime(0, now + durationSec);

  oscillator.start(now);
  oscillator.stop(now + durationSec);
}

export function isMuted(): boolean {
  return loadProgress().muted;
}

export function toggleMuted(): boolean {
  const next = !isMuted();
  setMuted(next);
  return next;
}
