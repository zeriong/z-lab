import { StageDef } from '../types/stage';
import { makeHouse } from './houseTemplate';

const TERRAIN = [
  { x: 280, y: 540, width: 560, height: 40 },
  { x: 900, y: 540, width: 600, height: 40 },
  { x: 580, y: 510, width: 60, height: 16, angle: -0.3 }, // 틈 가장자리 경사 램프
];
const GROUND_TOP = 520;

const house1 = makeHouse({ idPrefix: 's7-h1', cx: 450, groundTop: GROUND_TOP, pillarMaterial: 'wood', pillarMaterialRight: 'stone', roofMaterial: 'glass' });
const house2 = makeHouse({ idPrefix: 's7-h2', cx: 650, groundTop: GROUND_TOP, pillarMaterial: 'glass', pillarMaterialRight: 'stone', roofMaterial: 'wood' });
const house3 = makeHouse({ idPrefix: 's7-h3', cx: 770, groundTop: GROUND_TOP, pillarMaterial: 'stone', pillarMaterialRight: 'wood', roofMaterial: 'glass' });
const house4 = makeHouse({ idPrefix: 's7-h4', cx: 890, groundTop: GROUND_TOP, pillarMaterial: 'wood', pillarMaterialRight: 'glass', roofMaterial: 'stone' });

const stage07: StageDef = {
  id: 7,
  name: '경사 램프',
  background: '/assets/backgrounds/stage-07.svg',
  slingshot: { anchor: { x: 120, y: 450 } },
  projectileCount: 5,
  terrain: TERRAIN,
  blocks: [...house1.blocks, ...house2.blocks, ...house3.blocks, ...house4.blocks],
  pigs: [house1.pig, house2.pig, house3.pig, house4.pig],
};

export default stage07;
