/**
 * 진행도 저장 (플랜 P5 / §9: localStorage만, 서버 저장 없음).
 */
const KEY = 'slingshot-siege.progress.v1';

interface ProgressData {
  unlocked: number; // 해금된 최대 스테이지 id
  best: Record<string, number>;
  stars: Record<string, number>;
}

export class Progress {
  private data: ProgressData = { unlocked: 1, best: {}, stars: {} };

  constructor() {
    this.read();
  }

  private read(): void {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<ProgressData>;
      this.data = {
        unlocked: typeof parsed.unlocked === 'number' ? parsed.unlocked : 1,
        best: parsed.best ?? {},
        stars: parsed.stars ?? {},
      };
    } catch {
      /* 저장소 접근 불가(사파리 프라이빗 등)는 무시하고 메모리 진행도로 동작 */
    }
  }

  private write(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* 무시 */
    }
  }

  get unlocked(): number {
    return this.data.unlocked;
  }

  isUnlocked(stageId: number): boolean {
    return stageId <= this.data.unlocked;
  }

  best(stageId: number): number {
    return this.data.best[String(stageId)] ?? 0;
  }

  stars(stageId: number): number {
    return this.data.stars[String(stageId)] ?? 0;
  }

  totalStars(): number {
    return Object.values(this.data.stars).reduce((a, b) => a + b, 0);
  }

  recordClear(stageId: number, score: number, stars: number, maxStage: number): void {
    const k = String(stageId);
    if (score > (this.data.best[k] ?? 0)) this.data.best[k] = score;
    if (stars > (this.data.stars[k] ?? 0)) this.data.stars[k] = stars;
    if (stageId + 1 <= maxStage && stageId + 1 > this.data.unlocked) {
      this.data.unlocked = stageId + 1;
    }
    this.write();
  }

  resetAll(): void {
    this.data = { unlocked: 1, best: {}, stars: {} };
    this.write();
  }
}
