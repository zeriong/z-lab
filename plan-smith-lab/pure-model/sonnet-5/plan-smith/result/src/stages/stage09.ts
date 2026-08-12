import { StageDef } from '../types/stage';
import { makeHouse } from './houseTemplate';

// 최고난도 축: 재질 결합 + 틈 지형을 모두 결합하고 발사체 여유분을 최소화(pigs=5, projectiles=6).
const TERRAIN = [
  { x: 240, y: 540, width: 480, height: 40 }, // 0-480
  { x: 640, y: 540, width: 240, height: 40 }, // 520-760
  { x: 1000, y: 540, width: 400, height: 40 }, // 800-1200
];
const GROUND_TOP = 520;

const house1 = makeHouse({ idPrefix: 's9-h1', cx: 380, groundTop: GROUND_TOP, pillarMaterial: 'stone', pillarMaterialRight: 'glass', roofMaterial: 'stone' });
const house2 = makeHouse({ idPrefix: 's9-h2', cx: 640, groundTop: GROUND_TOP, pillarMaterial: 'wood', pillarMaterialRight: 'stone', roofMaterial: 'stone' });
const house3 = makeHouse({ idPrefix: 's9-h3', cx: 900, groundTop: GROUND_TOP, pillarMaterial: 'glass', pillarMaterialRight: 'stone', roofMaterial: 'stone' });
const house4 = makeHouse({ idPrefix: 's9-h4', cx: 1050, groundTop: GROUND_TOP, pillarMaterial: 'stone', pillarMaterialRight: 'wood', roofMaterial: 'glass' });
const house5 = makeHouse({ idPrefix: 's9-h5', cx: 1150, groundTop: GROUND_TOP, pillarMaterial: 'glass', pillarMaterialRight: 'glass', roofMaterial: 'stone' });

const stage09: StageDef = {
  id: 9,
  name: '최소한의 여유',
  background: '/assets/backgrounds/stage-09.svg',
  slingshot: { anchor: { x: 120, y: 450 } },
  projectileCount: 6,
  terrain: TERRAIN,
  blocks: [...house1.blocks, ...house2.blocks, ...house3.blocks, ...house4.blocks, ...house5.blocks],
  pigs: [house1.pig, house2.pig, house3.pig, house4.pig, house5.pig],
};

export default stage09;
