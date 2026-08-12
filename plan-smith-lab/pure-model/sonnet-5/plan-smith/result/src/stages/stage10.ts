import { StageDef } from '../types/stage';
import { makeHouse } from './houseTemplate';

// 최고난도 최종 스테이지: 발사체 여유분 0(projectiles === pigs).
const TERRAIN = [
  { x: 230, y: 540, width: 460, height: 40 }, // 0-460
  { x: 615, y: 540, width: 210, height: 40 }, // 510-720
  { x: 985, y: 540, width: 430, height: 40 }, // 770-1200
  { x: 740, y: 505, width: 50, height: 16, angle: 0.35 },
];
const GROUND_TOP = 520;

const house1 = makeHouse({ idPrefix: 's10-h1', cx: 350, groundTop: GROUND_TOP, pillarMaterial: 'stone', pillarMaterialRight: 'stone', roofMaterial: 'glass' });
const house2 = makeHouse({ idPrefix: 's10-h2', cx: 615, groundTop: GROUND_TOP, pillarMaterial: 'glass', pillarMaterialRight: 'stone', roofMaterial: 'stone' });
const house3 = makeHouse({ idPrefix: 's10-h3', cx: 870, groundTop: GROUND_TOP, pillarMaterial: 'stone', pillarMaterialRight: 'glass', roofMaterial: 'stone' });
const house4 = makeHouse({ idPrefix: 's10-h4', cx: 1000, groundTop: GROUND_TOP, pillarMaterial: 'glass', pillarMaterialRight: 'glass', roofMaterial: 'stone' });
const house5 = makeHouse({ idPrefix: 's10-h5', cx: 1130, groundTop: GROUND_TOP, pillarMaterial: 'stone', pillarMaterialRight: 'stone', roofMaterial: 'stone' });

const stage10: StageDef = {
  id: 10,
  name: '마지막 도전',
  background: '/assets/backgrounds/stage-10.svg',
  slingshot: { anchor: { x: 120, y: 450 } },
  projectileCount: 5,
  terrain: TERRAIN,
  blocks: [...house1.blocks, ...house2.blocks, ...house3.blocks, ...house4.blocks, ...house5.blocks],
  pigs: [house1.pig, house2.pig, house3.pig, house4.pig, house5.pig],
};

export default stage10;
