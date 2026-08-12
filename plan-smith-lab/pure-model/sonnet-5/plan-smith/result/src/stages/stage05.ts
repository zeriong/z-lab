import { StageDef } from '../types/stage';
import { makeHouse } from './houseTemplate';

const TERRAIN = [{ x: 600, y: 540, width: 1200, height: 40 }];
const GROUND_TOP = 520;

// 지붕은 항상 stone(가장 튼튼한 재질)으로 고정해 재질 확장 축의 난이도를 한 단계 올린다.
const house1 = makeHouse({ idPrefix: 's5-h1', cx: 500, groundTop: GROUND_TOP, pillarMaterial: 'wood', roofMaterial: 'stone' });
const house2 = makeHouse({ idPrefix: 's5-h2', cx: 650, groundTop: GROUND_TOP, pillarMaterial: 'glass', roofMaterial: 'stone' });
const house3 = makeHouse({ idPrefix: 's5-h3', cx: 800, groundTop: GROUND_TOP, pillarMaterial: 'stone', roofMaterial: 'stone' });

const stage05: StageDef = {
  id: 5,
  name: '튼튼한 지붕',
  background: '/assets/backgrounds/stage-05.svg',
  slingshot: { anchor: { x: 120, y: 450 } },
  projectileCount: 4,
  terrain: TERRAIN,
  blocks: [...house1.blocks, ...house2.blocks, ...house3.blocks],
  pigs: [house1.pig, house2.pig, house3.pig],
};

export default stage05;
