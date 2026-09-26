window.AB = window.AB || {};

(function() {
  'use strict';

  AB.LEVELS = [
    {
      name: '첫 발사',
      birds: ['red', 'red', 'red'],
      blocks: [
        { material: 'wood', x: 850, y: 590, w: 20, h: 100 },
        { material: 'wood', x: 950, y: 590, w: 20, h: 100 },
        { material: 'wood', x: 900, y: 530, w: 120, h: 20 }
      ],
      pigs: [
        { type: 'normal', x: 900, y: 500 }
      ]
    },
    {
      name: '두 채의 오두막',
      birds: ['red', 'red', 'red'],
      blocks: [
        { material: 'wood', x: 770, y: 590, w: 20, h: 100 },
        { material: 'wood', x: 870, y: 590, w: 20, h: 100 },
        { material: 'wood', x: 820, y: 530, w: 120, h: 20 },
        { material: 'wood', x: 990, y: 590, w: 20, h: 100 },
        { material: 'wood', x: 1090, y: 590, w: 20, h: 100 },
        { material: 'wood', x: 1040, y: 530, w: 120, h: 20 }
      ],
      pigs: [
        { type: 'normal', x: 820, y: 500 },
        { type: 'normal', x: 1040, y: 620 }
      ]
    },
    {
      name: '얼음 성',
      birds: ['red', 'red', 'red'],
      blocks: [
        { material: 'ice', x: 850, y: 590, w: 20, h: 100 },
        { material: 'ice', x: 950, y: 590, w: 20, h: 100 },
        { material: 'ice', x: 900, y: 530, w: 120, h: 20 },
        { material: 'ice', x: 850, y: 470, w: 20, h: 100 },
        { material: 'ice', x: 950, y: 470, w: 20, h: 100 },
        { material: 'ice', x: 900, y: 410, w: 120, h: 20 },
        { material: 'wood', x: 1060, y: 620, w: 40, h: 40 },
        { material: 'wood', x: 1060, y: 580, w: 40, h: 40 }
      ],
      pigs: [
        { type: 'normal', x: 900, y: 620 },
        { type: 'normal', x: 900, y: 500 },
        { type: 'small', x: 1060, y: 544 }
      ]
    },
    {
      name: '나무 탑',
      birds: ['red', 'yellow', 'red'],
      blocks: [
        { material: 'wood', x: 780, y: 620, w: 40, h: 40 },
        { material: 'wood', x: 780, y: 580, w: 40, h: 40 },
        { material: 'wood', x: 910, y: 590, w: 20, h: 100 },
        { material: 'wood', x: 1010, y: 590, w: 20, h: 100 },
        { material: 'wood', x: 960, y: 530, w: 120, h: 20 },
        { material: 'wood', x: 910, y: 470, w: 20, h: 100 },
        { material: 'wood', x: 1010, y: 470, w: 20, h: 100 },
        { material: 'wood', x: 960, y: 410, w: 120, h: 20 }
      ],
      pigs: [
        { type: 'normal', x: 960, y: 620 },
        { type: 'normal', x: 960, y: 500 },
        { type: 'normal', x: 960, y: 380 }
      ]
    },
    {
      name: '돌벽',
      birds: ['red', 'yellow', 'red', 'yellow'],
      blocks: [
        { material: 'stone', x: 760, y: 620, w: 40, h: 40 },
        { material: 'stone', x: 760, y: 580, w: 40, h: 40 },
        { material: 'stone', x: 760, y: 540, w: 40, h: 40 },
        { material: 'wood', x: 870, y: 590, w: 20, h: 100 },
        { material: 'wood', x: 970, y: 590, w: 20, h: 100 },
        { material: 'wood', x: 920, y: 530, w: 120, h: 20 },
        { material: 'stone', x: 1060, y: 590, w: 20, h: 100 },
        { material: 'stone', x: 1160, y: 590, w: 20, h: 100 },
        { material: 'wood', x: 1110, y: 530, w: 120, h: 20 }
      ],
      pigs: [
        { type: 'normal', x: 920, y: 620 },
        { type: 'normal', x: 1110, y: 500 },
        { type: 'small', x: 1110, y: 624 }
      ]
    },
    {
      name: '폭탄 새',
      birds: ['black', 'red', 'black'],
      blocks: [
        { material: 'wood', x: 770, y: 590, w: 20, h: 100 },
        { material: 'wood', x: 870, y: 590, w: 20, h: 100 },
        { material: 'wood', x: 820, y: 530, w: 120, h: 20 },
        { material: 'stone', x: 950, y: 590, w: 20, h: 100 },
        { material: 'stone', x: 1050, y: 590, w: 20, h: 100 },
        { material: 'stone', x: 1000, y: 530, w: 120, h: 20 },
        { material: 'wood', x: 1000, y: 500, w: 40, h: 40 }
      ],
      pigs: [
        { type: 'normal', x: 820, y: 500 },
        { type: 'big', x: 1000, y: 614 },
        { type: 'small', x: 1000, y: 464 }
      ]
    },
    {
      name: '3층 탑',
      birds: ['red', 'yellow', 'black', 'red'],
      blocks: [
        { material: 'stone', x: 820, y: 620, w: 40, h: 40 },
        { material: 'wood', x: 950, y: 590, w: 20, h: 100 },
        { material: 'wood', x: 1050, y: 590, w: 20, h: 100 },
        { material: 'wood', x: 1000, y: 530, w: 120, h: 20 },
        { material: 'ice', x: 950, y: 470, w: 20, h: 100 },
        { material: 'ice', x: 1050, y: 470, w: 20, h: 100 },
        { material: 'ice', x: 1000, y: 410, w: 120, h: 20 },
        { material: 'wood', x: 950, y: 350, w: 20, h: 100 },
        { material: 'wood', x: 1050, y: 350, w: 20, h: 100 },
        { material: 'wood', x: 1000, y: 290, w: 120, h: 20 }
      ],
      pigs: [
        { type: 'normal', x: 1000, y: 620 },
        { type: 'normal', x: 1000, y: 500 },
        { type: 'normal', x: 1000, y: 380 },
        { type: 'small', x: 1000, y: 264 }
      ]
    },
    {
      name: '쌍둥이 탑과 다리',
      birds: ['red', 'yellow', 'black', 'yellow'],
      blocks: [
        { material: 'wood', x: 790, y: 590, w: 20, h: 100 },
        { material: 'wood', x: 890, y: 590, w: 20, h: 100 },
        { material: 'wood', x: 840, y: 530, w: 120, h: 20 },
        { material: 'wood', x: 790, y: 470, w: 20, h: 100 },
        { material: 'wood', x: 890, y: 470, w: 20, h: 100 },
        { material: 'wood', x: 840, y: 410, w: 120, h: 20 },
        { material: 'stone', x: 1050, y: 590, w: 20, h: 100 },
        { material: 'stone', x: 1150, y: 590, w: 20, h: 100 },
        { material: 'stone', x: 1100, y: 530, w: 120, h: 20 },
        { material: 'wood', x: 1050, y: 470, w: 20, h: 100 },
        { material: 'wood', x: 1150, y: 470, w: 20, h: 100 },
        { material: 'wood', x: 1100, y: 410, w: 120, h: 20 },
        { material: 'wood', x: 970, y: 390, w: 220, h: 20 }
      ],
      pigs: [
        { type: 'normal', x: 840, y: 620 },
        { type: 'normal', x: 1100, y: 620 },
        { type: 'normal', x: 1100, y: 500 },
        { type: 'normal', x: 970, y: 360 }
      ]
    },
    {
      name: '벙커',
      birds: ['black', 'black', 'yellow', 'red'],
      blocks: [
        { material: 'stone', x: 830, y: 590, w: 20, h: 100 },
        { material: 'stone', x: 930, y: 590, w: 20, h: 100 },
        { material: 'ice', x: 880, y: 530, w: 120, h: 20 },
        { material: 'stone', x: 1030, y: 590, w: 20, h: 100 },
        { material: 'stone', x: 1130, y: 590, w: 20, h: 100 },
        { material: 'ice', x: 1080, y: 530, w: 120, h: 20 },
        { material: 'wood', x: 880, y: 500, w: 40, h: 40 },
        { material: 'wood', x: 1080, y: 500, w: 40, h: 40 },
        { material: 'stone', x: 980, y: 470, w: 240, h: 20 }
      ],
      pigs: [
        { type: 'normal', x: 880, y: 620 },
        { type: 'normal', x: 1080, y: 620 },
        { type: 'small', x: 980, y: 624 },
        { type: 'big', x: 980, y: 434 }
      ]
    },
    {
      name: '돼지 요새',
      birds: ['red', 'yellow', 'black', 'yellow', 'black'],
      blocks: [
        { material: 'stone', x: 720, y: 620, w: 40, h: 40 },
        { material: 'stone', x: 720, y: 580, w: 40, h: 40 },
        { material: 'wood', x: 810, y: 590, w: 20, h: 100 },
        { material: 'wood', x: 910, y: 590, w: 20, h: 100 },
        { material: 'wood', x: 860, y: 530, w: 120, h: 20 },
        { material: 'ice', x: 810, y: 470, w: 20, h: 100 },
        { material: 'ice', x: 910, y: 470, w: 20, h: 100 },
        { material: 'ice', x: 860, y: 410, w: 120, h: 20 },
        { material: 'wood', x: 980, y: 620, w: 40, h: 40 },
        { material: 'ice', x: 980, y: 580, w: 40, h: 40 },
        { material: 'stone', x: 1050, y: 590, w: 20, h: 100 },
        { material: 'stone', x: 1150, y: 590, w: 20, h: 100 },
        { material: 'stone', x: 1100, y: 530, w: 120, h: 20 },
        { material: 'wood', x: 1050, y: 470, w: 20, h: 100 },
        { material: 'wood', x: 1150, y: 470, w: 20, h: 100 },
        { material: 'wood', x: 1100, y: 410, w: 120, h: 20 },
        { material: 'wood', x: 1050, y: 350, w: 20, h: 100 },
        { material: 'wood', x: 1150, y: 350, w: 20, h: 100 },
        { material: 'wood', x: 1100, y: 290, w: 120, h: 20 }
      ],
      pigs: [
        { type: 'normal', x: 860, y: 620 },
        { type: 'small', x: 860, y: 504 },
        { type: 'big', x: 1100, y: 614 },
        { type: 'normal', x: 1100, y: 380 },
        { type: 'small', x: 1100, y: 264 }
      ]
    }
  ];
})();
