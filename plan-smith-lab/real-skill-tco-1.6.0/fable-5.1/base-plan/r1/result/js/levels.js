window.AB = window.AB || {};

// 스테이지 데이터 (계획서 §9 그대로). 좌표는 모두 중심 좌표.
// terrain: 추가 정적 발판(땅은 항상 자동 생성), blocks: { t: 재질, s: 모양, x, y }, pigs: { size, x, y }
AB.LEVELS = [
  { id: 1, name: '첫 걸음', birds: ['red', 'red', 'red'],
    star2: 15000, star3: 25000,
    terrain: [],
    blocks: [
      { t: 'wood', s: 'post', x: 720, y: 600 },
      { t: 'wood', s: 'post', x: 800, y: 600 },
      { t: 'wood', s: 'plank', x: 760, y: 550 }
    ],
    pigs: [
      { size: 'm', x: 760, y: 620 }
    ] },
  { id: 2, name: '두 채의 집', birds: ['red', 'red', 'red', 'red'],
    star2: 20000, star3: 32000,
    terrain: [],
    blocks: [
      { t: 'wood', s: 'post', x: 660, y: 600 },
      { t: 'wood', s: 'post', x: 740, y: 600 },
      { t: 'wood', s: 'plank', x: 700, y: 550 },
      { t: 'wood', s: 'post', x: 900, y: 600 },
      { t: 'wood', s: 'post', x: 980, y: 600 },
      { t: 'wood', s: 'plank', x: 940, y: 550 }
    ],
    pigs: [
      { size: 'm', x: 700, y: 620 },
      { size: 's', x: 940, y: 626 }
    ] },
  { id: 3, name: '유리성', birds: ['red', 'red', 'red'],
    star2: 22000, star3: 34000,
    terrain: [],
    blocks: [
      { t: 'ice', s: 'post', x: 780, y: 600 },
      { t: 'ice', s: 'post', x: 860, y: 600 },
      { t: 'ice', s: 'plank', x: 820, y: 550 },
      { t: 'ice', s: 'post', x: 780, y: 500 },
      { t: 'ice', s: 'post', x: 860, y: 500 },
      { t: 'ice', s: 'plank', x: 820, y: 450 }
    ],
    pigs: [
      { size: 'm', x: 820, y: 620 },
      { size: 's', x: 820, y: 426 }
    ] },
  { id: 4, name: '높은 탑', birds: ['chuck', 'red', 'chuck', 'red'],
    star2: 25000, star3: 40000,
    terrain: [],
    blocks: [
      { t: 'wood', s: 'post', x: 840, y: 600 },
      { t: 'wood', s: 'post', x: 920, y: 600 },
      { t: 'wood', s: 'plank', x: 880, y: 550 },
      { t: 'wood', s: 'post', x: 840, y: 500 },
      { t: 'wood', s: 'post', x: 920, y: 500 },
      { t: 'wood', s: 'plank', x: 880, y: 450 },
      { t: 'wood', s: 'post', x: 840, y: 400 },
      { t: 'wood', s: 'post', x: 920, y: 400 },
      { t: 'wood', s: 'plank', x: 880, y: 350 }
    ],
    pigs: [
      { size: 's', x: 880, y: 326 },
      { size: 'm', x: 880, y: 620 }
    ] },
  { id: 5, name: '돌담 너머', birds: ['red', 'red', 'chuck', 'red', 'red'],
    star2: 30000, star3: 48000,
    terrain: [],
    blocks: [
      { t: 'stone', s: 'post', x: 640, y: 600 },
      { t: 'stone', s: 'post', x: 640, y: 520 },
      { t: 'wood', s: 'post', x: 780, y: 600 },
      { t: 'wood', s: 'post', x: 860, y: 600 },
      { t: 'wood', s: 'plank', x: 820, y: 550 },
      { t: 'ice', s: 'post', x: 980, y: 600 },
      { t: 'ice', s: 'post', x: 1060, y: 600 },
      { t: 'ice', s: 'plank', x: 1020, y: 550 }
    ],
    pigs: [
      { size: 'm', x: 820, y: 620 },
      { size: 'm', x: 1020, y: 620 },
      { size: 's', x: 1020, y: 526 }
    ] },
  { id: 6, name: '벙커', birds: ['bomb', 'red', 'bomb', 'red'],
    star2: 30000, star3: 48000,
    terrain: [],
    blocks: [
      { t: 'stone', s: 'square', x: 780, y: 620 },
      { t: 'stone', s: 'square', x: 860, y: 620 },
      { t: 'stone', s: 'plank', x: 820, y: 590 },
      { t: 'wood', s: 'square', x: 820, y: 560 },
      { t: 'wood', s: 'post', x: 920, y: 600 },
      { t: 'wood', s: 'post', x: 1000, y: 600 },
      { t: 'wood', s: 'plank', x: 960, y: 550 },
      { t: 'wood', s: 'post', x: 920, y: 500 },
      { t: 'wood', s: 'post', x: 1000, y: 500 },
      { t: 'wood', s: 'plank', x: 960, y: 450 }
    ],
    pigs: [
      { size: 's', x: 820, y: 626 },
      { size: 'm', x: 960, y: 620 },
      { size: 's', x: 960, y: 426 }
    ] },
  { id: 7, name: '공중 정원', birds: ['red', 'chuck', 'red', 'chuck', 'red'],
    star2: 32000, star3: 52000,
    terrain: [{ x: 1000, y: 470, w: 240, h: 20 }],
    blocks: [
      { t: 'ice', s: 'post', x: 960, y: 420 },
      { t: 'ice', s: 'post', x: 1040, y: 420 },
      { t: 'ice', s: 'plank', x: 1000, y: 370 },
      { t: 'wood', s: 'post', x: 660, y: 600 },
      { t: 'wood', s: 'post', x: 740, y: 600 },
      { t: 'wood', s: 'plank', x: 700, y: 550 },
      { t: 'wood', s: 'post', x: 660, y: 500 },
      { t: 'wood', s: 'post', x: 740, y: 500 },
      { t: 'wood', s: 'plank', x: 700, y: 450 }
    ],
    pigs: [
      { size: 'm', x: 1000, y: 440 },
      { size: 's', x: 700, y: 626 },
      { size: 'm', x: 700, y: 420 }
    ] },
  { id: 8, name: '혼합 재료', birds: ['red', 'bomb', 'chuck', 'red', 'red', 'red'],
    star2: 40000, star3: 62000,
    terrain: [],
    blocks: [
      { t: 'wood', s: 'post', x: 720, y: 600 },
      { t: 'wood', s: 'post', x: 800, y: 600 },
      { t: 'wood', s: 'plank', x: 760, y: 550 },
      { t: 'wood', s: 'post', x: 720, y: 500 },
      { t: 'wood', s: 'post', x: 800, y: 500 },
      { t: 'wood', s: 'plank', x: 760, y: 450 },
      { t: 'stone', s: 'slab', x: 760, y: 430 },
      { t: 'ice', s: 'post', x: 860, y: 600 },
      { t: 'ice', s: 'post', x: 940, y: 600 },
      { t: 'ice', s: 'plank', x: 900, y: 550 },
      { t: 'ice', s: 'post', x: 860, y: 500 },
      { t: 'ice', s: 'post', x: 940, y: 500 },
      { t: 'ice', s: 'plank', x: 900, y: 450 },
      { t: 'ice', s: 'post', x: 860, y: 400 },
      { t: 'ice', s: 'post', x: 940, y: 400 },
      { t: 'ice', s: 'plank', x: 900, y: 350 }
    ],
    pigs: [
      { size: 'm', x: 760, y: 620 },
      { size: 's', x: 760, y: 526 },
      { size: 'm', x: 900, y: 620 },
      { size: 's', x: 900, y: 326 }
    ] },
  { id: 9, name: '요새', birds: ['chuck', 'bomb', 'red', 'chuck', 'red', 'bomb'],
    star2: 45000, star3: 70000,
    terrain: [],
    blocks: [
      { t: 'stone', s: 'post', x: 600, y: 600 },
      { t: 'stone', s: 'post', x: 600, y: 520 },
      { t: 'stone', s: 'square', x: 600, y: 460 },
      { t: 'ice', s: 'post', x: 720, y: 600 },
      { t: 'ice', s: 'post', x: 800, y: 600 },
      { t: 'ice', s: 'plank', x: 760, y: 550 },
      { t: 'ice', s: 'post', x: 720, y: 500 },
      { t: 'ice', s: 'post', x: 800, y: 500 },
      { t: 'ice', s: 'plank', x: 760, y: 450 },
      { t: 'wood', s: 'post', x: 920, y: 600 },
      { t: 'wood', s: 'post', x: 1000, y: 600 },
      { t: 'wood', s: 'plank', x: 960, y: 550 },
      { t: 'wood', s: 'post', x: 920, y: 500 },
      { t: 'wood', s: 'post', x: 1000, y: 500 },
      { t: 'wood', s: 'plank', x: 960, y: 450 },
      { t: 'stone', s: 'shortpost', x: 1100, y: 615 },
      { t: 'stone', s: 'slab', x: 1100, y: 580 }
    ],
    pigs: [
      { size: 'm', x: 760, y: 620 },
      { size: 's', x: 760, y: 426 },
      { size: 'm', x: 960, y: 620 },
      { size: 'l', x: 1100, y: 542 }
    ] },
  { id: 10, name: '킹피그의 성', birds: ['red', 'chuck', 'bomb', 'red', 'chuck', 'bomb', 'red'],
    star2: 55000, star3: 85000,
    terrain: [],
    blocks: [
      { t: 'wood', s: 'post', x: 580, y: 600 },
      { t: 'wood', s: 'post', x: 660, y: 600 },
      { t: 'wood', s: 'plank', x: 620, y: 550 },
      { t: 'ice', s: 'post', x: 750, y: 600 },
      { t: 'ice', s: 'post', x: 830, y: 600 },
      { t: 'ice', s: 'plank', x: 790, y: 550 },
      { t: 'ice', s: 'post', x: 750, y: 500 },
      { t: 'ice', s: 'post', x: 830, y: 500 },
      { t: 'ice', s: 'plank', x: 790, y: 450 },
      { t: 'stone', s: 'post', x: 930, y: 600 },
      { t: 'stone', s: 'post', x: 1070, y: 600 },
      { t: 'stone', s: 'longplank', x: 1000, y: 550 },
      { t: 'stone', s: 'post', x: 930, y: 500 },
      { t: 'stone', s: 'post', x: 1070, y: 500 },
      { t: 'stone', s: 'longplank', x: 1000, y: 450 }
    ],
    pigs: [
      { size: 's', x: 620, y: 626 },
      { size: 'm', x: 790, y: 620 },
      { size: 's', x: 790, y: 426 },
      { size: 'l', x: 1000, y: 612 },
      { size: 'm', x: 1000, y: 420 }
    ] }
];
