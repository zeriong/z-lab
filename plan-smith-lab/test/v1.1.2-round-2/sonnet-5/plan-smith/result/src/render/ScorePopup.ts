export interface ScorePopup {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
}

/** Plan §매트릭스 #9 quality floor: "획득 즉시 '+점수' 표시". */
export class ScorePopupSystem {
  popups: ScorePopup[] = [];

  spawn(x: number, y: number, text: string) {
    this.popups.push({ x, y, text, life: 0, maxLife: 45 });
  }

  update() {
    for (const p of this.popups) {
      p.y -= 1;
      p.life += 1;
    }
    this.popups = this.popups.filter((p) => p.life < p.maxLife);
  }

  clear() {
    this.popups = [];
  }
}
