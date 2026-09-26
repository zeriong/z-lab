// 스테이지 1 "첫 발사" — 나무 기둥 2 + 보 1 오두막, 돼지는 안에. 새 요소: 드래그 발사 (R25 안내)
// 오두막은 정적 받침(높이 100) 위에 있다. 앞 기둥을 부수고 들어간 새가 돼지를 치거나,
// 밀려난 돼지가 받침 아래로 떨어져(낙하 100 → 데미지 > 6) 제거된다.
// 풀이 궤적(pull 114,−36): x=980에서 y≈666(받침 모서리 위), x=1000에서 앞 기둥 중앙, x=1100에서 y≈695(돼지 중심 700).
import { fairStars } from '../game/score';
import type { StageData } from '../types';

const base: Omit<StageData, 'stars'> = {
  id: 1,
  name: '첫 발사',
  birds: ['red', 'red', 'red'],
  statics: [{ x: 1100, y: 770, w: 240, h: 100 }], // 받침: x 980–1220, 윗면 y=720
  blocks: [
    { kind: 'box', material: 'wood', x: 1030, y: 680, w: 20, h: 80 }, // 앞 기둥 640–720
    { kind: 'box', material: 'wood', x: 1170, y: 680, w: 20, h: 80 }, // 뒤 기둥
    { kind: 'box', material: 'wood', x: 1100, y: 630, w: 180, h: 20 }, // 보 620–640
  ],
  pigs: [{ type: 'small', x: 1100, y: 700 }],
  slack: 2,
  solution: [{ pull: { x: 114, y: -36 } }],
  hint: true,
};

export const stage01: StageData = { ...base, stars: fairStars(base) };
