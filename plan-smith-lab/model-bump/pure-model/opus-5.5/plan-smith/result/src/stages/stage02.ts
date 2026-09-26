// 스테이지 2 "나무 탑" — 3층 나무 탑 2동, 꼭대기마다 돼지. 새 요소: 적층 붕괴
// 층 = 기둥 20×80 두 개 + 판 120×20. 층 높이 100, 꼭대기 판 윗면 y=520, 돼지 중심 y=500.
// 풀이 1 (101.8,−63.6): 꼭짓점 근처의 거의 수평 구간으로 탑 A 꼭대기 돼지를 친다 (43스텝째 접촉).
// 풀이 2 (98.2,−68.8): 탑 A 위(y≈448)를 넘어 탑 B 꼭대기 돼지를 친다 (63스텝째 접촉).
import { fairStars } from '../game/score';
import type { BlockDef, StageData } from '../types';

function tower(cx: number): BlockDef[] {
  const out: BlockDef[] = [];
  for (let k = 0; k < 3; k++) {
    const base = 820 - 100 * k;
    out.push({ kind: 'box', material: 'wood', x: cx - 50, y: base - 40, w: 20, h: 80 });
    out.push({ kind: 'box', material: 'wood', x: cx + 50, y: base - 40, w: 20, h: 80 });
    out.push({ kind: 'box', material: 'wood', x: cx, y: base - 90, w: 120, h: 20 });
  }
  return out;
}

const base: Omit<StageData, 'stars'> = {
  id: 2,
  name: '나무 탑',
  birds: ['red', 'red', 'red'],
  blocks: [...tower(1000), ...tower(1350)],
  pigs: [
    { type: 'small', x: 1000, y: 500 },
    { type: 'small', x: 1350, y: 500 },
  ],
  slack: 1,
  solution: [{ pull: { x: 101.8, y: -63.6 } }, { pull: { x: 98.2, y: -68.8 } }],
};

export const stage02: StageData = { ...base, stars: fairStars(base) };
