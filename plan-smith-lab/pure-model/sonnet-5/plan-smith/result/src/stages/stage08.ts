import { StageDef } from '../types/stage';
import { makeHouse } from './houseTemplate';

// 플랫폼 3개 + 틈 2개 + 램프 1개. 콘텐츠 축 6-8 중 가장 복잡한 지형.
const TERRAIN = [
  { x: 250, y: 540, width: 500, height: 40 }, // 0-500
  { x: 660, y: 540, width: 240, height: 40 }, // 540-780
  { x: 1010, y: 540, width: 380, height: 40 }, // 820-1200
  { x: 800, y: 510, width: 50, height: 16, angle: 0.3 },
];
const GROUND_TOP = 520;

const house1 = makeHouse({ idPrefix: 's8-h1', cx: 430, groundTop: GROUND_TOP, pillarMaterial: 'stone', pillarMaterialRight: 'wood', roofMaterial: 'glass' });
const house2 = makeHouse({ idPrefix: 's8-h2', cx: 650, groundTop: GROUND_TOP, pillarMaterial: 'glass', pillarMaterialRight: 'glass', roofMaterial: 'stone' });
const house3 = makeHouse({ idPrefix: 's8-h3', cx: 900, groundTop: GROUND_TOP, pillarMaterial: 'wood', pillarMaterialRight: 'stone', roofMaterial: 'glass' });
const house4 = makeHouse({ idPrefix: 's8-h4', cx: 1050, groundTop: GROUND_TOP, pillarMaterial: 'stone', pillarMaterialRight: 'stone', roofMaterial: 'wood' });

const stage08: StageDef = {
  id: 8,
  name: '두 개의 틈',
  background: '/assets/backgrounds/stage-08.svg',
  slingshot: { anchor: { x: 120, y: 450 } },
  projectileCount: 5,
  terrain: TERRAIN,
  blocks: [...house1.blocks, ...house2.blocks, ...house3.blocks, ...house4.blocks],
  pigs: [house1.pig, house2.pig, house3.pig, house4.pig],
};

export default stage08;
