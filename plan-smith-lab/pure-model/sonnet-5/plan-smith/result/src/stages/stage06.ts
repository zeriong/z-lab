import { StageDef } from '../types/stage';
import { makeHouse } from './houseTemplate';

// 좌측 플랫폼(0-560) + 40px 틈 + 우측 플랫폼(600-1200). 발사체는 틈을 넘겨야 한다.
const TERRAIN = [
  { x: 280, y: 540, width: 560, height: 40 },
  { x: 900, y: 540, width: 600, height: 40 },
];
const GROUND_TOP = 520;

const house1 = makeHouse({ idPrefix: 's6-h1', cx: 450, groundTop: GROUND_TOP, pillarMaterial: 'wood', pillarMaterialRight: 'stone', roofMaterial: 'glass' });
const house2 = makeHouse({ idPrefix: 's6-h2', cx: 650, groundTop: GROUND_TOP, pillarMaterial: 'stone', pillarMaterialRight: 'wood', roofMaterial: 'glass' });
const house3 = makeHouse({ idPrefix: 's6-h3', cx: 770, groundTop: GROUND_TOP, pillarMaterial: 'wood', pillarMaterialRight: 'glass', roofMaterial: 'stone' });

const stage06: StageDef = {
  id: 6,
  name: '틈 너머로',
  background: '/assets/backgrounds/stage-06.svg',
  slingshot: { anchor: { x: 120, y: 450 } },
  projectileCount: 4,
  terrain: TERRAIN,
  blocks: [...house1.blocks, ...house2.blocks, ...house3.blocks],
  pigs: [house1.pig, house2.pig, house3.pig],
};

export default stage06;
