// Declarative stage data (plan section 4). Kept as a plain JS module instead
// of stages/stage-01.json ... stage-10.json files: this build is opened
// directly as index.html (file://), and fetch() of local JSON fails there
// under CORS with no dev server available. A statically-imported module is
// the same "no runtime fetch, bundled at load time" outcome the plan asked
// for, just expressed as .js instead of .json.
//
// Difficulty curve follows the plan: 1-3 wood only (learn the physics),
// 4-6 mixed materials + a second ("bomb") bird type, 7-10 multi-tier
// structures with tighter bird counts.

const GROUND_Y = 480;
const ANCHOR = { x: 150, y: 380 };

function block(type, x, y, width, height, angle = 0) {
  return { type, x, y, width, height, angle };
}

function pig(x, y, radius = 20) {
  return { x, y, radius };
}

const STAGES = [
  {
    id: 1,
    birds: ['normal', 'normal', 'normal'],
    slingshotAnchor: ANCHOR,
    groundY: GROUND_Y,
    parScore: 800,
    blocks: [block('wood', 650, 430, 26, 100)],
    pigs: [pig(650, 360)],
  },
  {
    id: 2,
    birds: ['normal', 'normal', 'normal'],
    slingshotAnchor: ANCHOR,
    groundY: GROUND_Y,
    parScore: 1100,
    blocks: [
      block('wood', 550, 435, 26, 90),
      block('wood', 750, 435, 26, 90),
    ],
    pigs: [pig(550, 370), pig(750, 370)],
  },
  {
    id: 3,
    birds: ['normal', 'normal', 'normal'],
    slingshotAnchor: ANCHOR,
    groundY: GROUND_Y,
    parScore: 900,
    blocks: [
      block('wood', 600, 440, 28, 80),
      block('wood', 760, 440, 28, 80),
      block('wood', 680, 390, 190, 20), // roof
    ],
    pigs: [pig(680, 460)],
  },
  {
    id: 4,
    birds: ['normal', 'bomb', 'normal'],
    slingshotAnchor: ANCHOR,
    groundY: GROUND_Y,
    parScore: 1400,
    blocks: [
      block('stone', 550, 435, 30, 90),
      block('glass', 550, 380, 90, 20),
      block('wood', 780, 445, 26, 70),
    ],
    pigs: [pig(550, 350), pig(780, 390)],
  },
  {
    id: 5,
    birds: ['normal', 'bomb', 'normal'],
    slingshotAnchor: ANCHOR,
    groundY: GROUND_Y,
    parScore: 1500,
    blocks: [
      block('stone', 560, 450, 26, 60),
      block('stone', 700, 450, 26, 60),
      block('wood', 630, 410, 180, 20), // mid floor
      block('wood', 580, 375, 20, 50), // upper pillar left
      block('wood', 680, 375, 20, 50), // upper pillar right
      block('glass', 630, 342, 140, 16), // upper roof
    ],
    pigs: [pig(630, 460), pig(630, 380)],
  },
  {
    id: 6,
    birds: ['normal', 'normal', 'bomb', 'normal'],
    slingshotAnchor: ANCHOR,
    groundY: GROUND_Y,
    parScore: 1800,
    blocks: [
      block('stone', 500, 420, 30, 120),
      block('stone', 850, 420, 30, 120),
      block('wood', 675, 350, 380, 20), // bridge deck
    ],
    pigs: [pig(440, 460), pig(675, 320), pig(910, 460)],
  },
  {
    id: 7,
    birds: ['bomb', 'normal', 'normal'],
    slingshotAnchor: ANCHOR,
    groundY: GROUND_Y,
    parScore: 2000,
    blocks: [
      block('wood', 550, 450, 36, 60),
      block('wood', 650, 450, 36, 60),
      block('wood', 750, 450, 36, 60),
      block('wood', 600, 410, 110, 20),
      block('wood', 700, 410, 110, 20),
      block('stone', 650, 390, 140, 20), // apex
    ],
    pigs: [pig(500, 460), pig(800, 460), pig(650, 360)],
  },
  {
    id: 8,
    birds: ['normal', 'bomb', 'normal'],
    slingshotAnchor: ANCHOR,
    groundY: GROUND_Y,
    parScore: 2200,
    blocks: [
      block('stone', 520, 410, 30, 140),
      block('stone', 830, 410, 30, 140),
      block('glass', 675, 330, 340, 20), // outer roof
      block('wood', 600, 430, 24, 100),
      block('wood', 750, 430, 24, 100),
      block('wood', 675, 370, 180, 20), // inner floor
    ],
    pigs: [pig(675, 460), pig(675, 340), pig(675, 300)],
  },
  {
    id: 9,
    birds: ['bomb', 'normal', 'bomb'],
    slingshotAnchor: ANCHOR,
    groundY: GROUND_Y,
    parScore: 2500,
    blocks: [
      block('stone', 520, 435, 26, 90),
      block('wood', 600, 430, 26, 100),
      block('stone', 680, 435, 26, 90),
      block('wood', 760, 430, 26, 100),
    ],
    pigs: [pig(520, 370), pig(600, 360), pig(680, 370), pig(760, 360)],
  },
  {
    id: 10,
    birds: ['normal', 'bomb', 'bomb'],
    slingshotAnchor: ANCHOR,
    groundY: GROUND_Y,
    parScore: 3000,
    blocks: [
      block('stone', 480, 400, 34, 160),
      block('stone', 880, 400, 34, 160),
      block('glass', 680, 310, 420, 20), // top roof
      block('wood', 580, 425, 26, 110),
      block('wood', 780, 425, 26, 110),
      block('wood', 680, 360, 220, 20), // mid floor
      block('glass', 620, 315, 20, 70), // upper pillar left
      block('glass', 740, 315, 20, 70), // upper pillar right
      block('glass', 680, 270, 150, 16), // upper roof
    ],
    pigs: [
      pig(430, 460),
      pig(930, 460),
      pig(680, 460),
      pig(680, 330),
      pig(680, 242),
    ],
  },
];

export default STAGES;
