/**
 * 진행도 저장/복원 (R30, A3).
 *
 * localStorage를 못 쓰는 브라우저(사파리 프라이빗 등)에서는 예외를 던지는 대신
 * **인메모리 폴백**으로 내려가고 `available=false`를 남긴다. 스테이지 선택 화면이
 * 그 값을 보고 "이 브라우저에서는 진행도가 저장되지 않습니다" 배너를 띄운다.
 *
 * 저장 규칙은 하나뿐이다: **최대값 병합.** 두 번째 플레이가 더 낮은 점수여도
 * 기록을 깎지 않는다.
 */

import { STAGE_COUNT } from '../data/schema';

const KEY = 'slingshot.progress.v1';

export interface ProgressData {
  /** 해금된 최대 스테이지 번호 (1 이상) */
  unlocked: number;
  /** stageId → 최고 별 (0..3) */
  stars: Record<string, number>;
  /** stageId → 최고 점수 */
  best: Record<string, number>;
  muted: boolean;
  /** R36 defer 트리거 계측: 세션 시작 시 뷰포트 방향만 센다(개인정보 없음) */
  viewport: { portrait: number; landscape: number };
}

function emptyData(): ProgressData {
  return {
    unlocked: 1,
    stars: {},
    best: {},
    muted: false,
    viewport: { portrait: 0, landscape: 0 },
  };
}

function coerce(raw: unknown): ProgressData {
  const base = emptyData();
  if (typeof raw !== 'object' || raw === null) return base;
  const bag = raw as Record<string, unknown>;

  if (typeof bag.unlocked === 'number' && Number.isFinite(bag.unlocked)) {
    base.unlocked = Math.min(STAGE_COUNT, Math.max(1, Math.floor(bag.unlocked)));
  }
  if (typeof bag.muted === 'boolean') base.muted = bag.muted;

  const copyNumbers = (src: unknown, into: Record<string, number>, max: number): void => {
    if (typeof src !== 'object' || src === null) return;
    for (const [k, v] of Object.entries(src as Record<string, unknown>)) {
      const id = Number(k);
      if (!Number.isInteger(id) || id < 1 || id > STAGE_COUNT) continue;
      if (typeof v === 'number' && Number.isFinite(v)) into[k] = Math.min(max, Math.max(0, v));
    }
  };
  copyNumbers(bag.stars, base.stars, 3);
  copyNumbers(bag.best, base.best, Number.MAX_SAFE_INTEGER);

  const vp = bag.viewport as Record<string, unknown> | undefined;
  if (vp && typeof vp === 'object') {
    if (typeof vp.portrait === 'number') base.viewport.portrait = vp.portrait;
    if (typeof vp.landscape === 'number') base.viewport.landscape = vp.landscape;
  }
  return base;
}

export class Progress {
  private data: ProgressData = emptyData();
  /** false면 인메모리 폴백 상태 (배너 표시 조건) */
  readonly available: boolean;

  constructor() {
    this.available = probeStorage();
    this.data = this.read();
  }

  private read(): ProgressData {
    if (!this.available) return emptyData();
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return emptyData();
      return coerce(JSON.parse(raw));
    } catch {
      // 손상된 JSON — 빈 진행도로 시작한다. 여기서 던지면 게임이 아예 안 뜬다.
      return emptyData();
    }
  }

  private write(): void {
    if (!this.available) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* 용량 초과 등 — 이번 세션은 인메모리로 계속 간다 */
    }
  }

  snapshot(): ProgressData {
    return JSON.parse(JSON.stringify(this.data)) as ProgressData;
  }

  get unlocked(): number {
    return this.data.unlocked;
  }

  isUnlocked(stageId: number): boolean {
    return stageId <= this.data.unlocked;
  }

  starsOf(stageId: number): number {
    return this.data.stars[String(stageId)] ?? 0;
  }

  bestOf(stageId: number): number {
    return this.data.best[String(stageId)] ?? 0;
  }

  totalStars(): number {
    let sum = 0;
    for (let i = 1; i <= STAGE_COUNT; i += 1) sum += this.starsOf(i);
    return sum;
  }

  get muted(): boolean {
    return this.data.muted;
  }

  setMuted(muted: boolean): void {
    this.data.muted = muted;
    this.write();
  }

  /** 클리어 결과 병합. 반환값은 "새 기록인가". */
  recordClear(stageId: number, score: number, stars: number): boolean {
    const key = String(stageId);
    const prevScore = this.bestOf(stageId);
    const prevStars = this.starsOf(stageId);

    const improved = score > prevScore || stars > prevStars;
    this.data.best[key] = Math.max(prevScore, score);
    this.data.stars[key] = Math.max(prevStars, stars);
    if (stageId + 1 <= STAGE_COUNT) {
      this.data.unlocked = Math.max(this.data.unlocked, stageId + 1);
    }
    this.write();
    return improved;
  }

  /** 실패해도 점수는 남긴다(해금은 하지 않는다). */
  recordAttempt(stageId: number, score: number): void {
    const key = String(stageId);
    this.data.best[key] = Math.max(this.bestOf(stageId), score);
    this.write();
  }

  /** §7.6: 세션 시작 시 방향만 1 증가시킨다. R36 defer 트리거의 관측 장치. */
  countViewport(isPortrait: boolean): void {
    if (isPortrait) this.data.viewport.portrait += 1;
    else this.data.viewport.landscape += 1;
    this.write();
  }

  /** 세로 접속 비중 — 20%를 넘으면 R36의 트리거가 발화한 것이다 */
  portraitRatio(): number {
    const { portrait, landscape } = this.data.viewport;
    const total = portrait + landscape;
    return total === 0 ? 0 : portrait / total;
  }

  reset(): void {
    this.data = emptyData();
    this.write();
  }
}

function probeStorage(): boolean {
  try {
    const probe = '__slingshot_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
