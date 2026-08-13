// src/stages.js
// 스테이지 데이터 및 빌더 (§11)
// 의존성: C, MAT

const SB = {
  V(world, cx, base, mat) {
    // 세로기둥 24×110, base 기준
    const y = base - 55;
    return P.addBox(world, cx, y, 12, 55, {
      mat,
      kind: 'block'
    });
  },

  H(world, cx, base, len, mat) {
    // 가로판 len×24, base 기준
    const y = base - 12;
    return P.addBox(world, cx, y, len / 2, 12, {
      mat,
      kind: 'block'
    });
  },

  BLK(world, cx, base, w, h, mat) {
    // 임의 박스
    const y = base - h / 2;
    return P.addBox(world, cx, y, w / 2, h / 2, {
      mat,
      kind: 'block'
    });
  },

  HUT(world, cx, base, mat, span = 110) {
    // 오두막 3조각: 좌기둥, 우기둥, 지붕판
    // 총 높이 134
    const bodies = [];
    bodies.push(SB.V(world, cx - span / 2, base, mat));
    bodies.push(SB.V(world, cx + span / 2, base, mat));
    bodies.push(SB.H(world, cx, base - 110, span + 48, mat));
    return bodies;
  },

  PIG(world, cx, base, r = 20) {
    // 돼지 원
    const y = base - r;
    return P.addCircle(world, cx, y, r, {
      mat: 'pig',
      kind: 'pig'
    });
  }
};

const STAGES = [
  {
    id: 1,
    name: '첫 발사',
    birds: ['red', 'red', 'red'],
    build(world) {
      SB.HUT(world, 1150, 620, 'wood');
      SB.PIG(world, 1150, 620);
    }
  },
  {
    id: 2,
    name: '이층집',
    birds: ['red', 'red', 'red'],
    build(world) {
      SB.HUT(world, 1150, 620, 'wood');
      SB.HUT(world, 1150, 486, 'wood');
      SB.PIG(world, 1150, 620);
      SB.PIG(world, 1150, 486);
    }
  },
  {
    id: 3,
    name: '쌍둥이',
    birds: ['red', 'yellow', 'red'],
    build(world) {
      SB.HUT(world, 1000, 620, 'wood');
      SB.HUT(world, 1320, 620, 'wood');
      SB.PIG(world, 1000, 620);
      SB.PIG(world, 1320, 620);
    }
  },
  {
    id: 4,
    name: '유리 지붕',
    birds: ['red', 'red', 'yellow'],
    build(world) {
      SB.HUT(world, 1100, 620, 'glass');
      SB.HUT(world, 1400, 620, 'glass');
      SB.H(world, 1250, 486, 340, 'wood');
      SB.PIG(world, 1100, 620);
      SB.PIG(world, 1400, 620);
    }
  },
  {
    id: 5,
    name: '돌 오두막',
    birds: ['red', 'yellow', 'black'],
    build(world) {
      SB.HUT(world, 1200, 620, 'stone');
      SB.HUT(world, 1200, 486, 'wood');
      SB.PIG(world, 1200, 620);
      SB.PIG(world, 1200, 486);
    }
  },
  {
    id: 6,
    name: '삼각 마을',
    birds: ['red', 'yellow', 'yellow', 'red'],
    build(world) {
      SB.HUT(world, 980, 620, 'wood');
      SB.HUT(world, 1240, 620, 'stone');
      SB.HUT(world, 1500, 620, 'wood');
      SB.PIG(world, 980, 620);
      SB.PIG(world, 1240, 620);
      SB.PIG(world, 1500, 620);
    }
  },
  {
    id: 7,
    name: '탑',
    birds: ['red', 'yellow', 'black', 'red'],
    build(world) {
      SB.HUT(world, 1250, 620, 'stone');
      SB.HUT(world, 1250, 486, 'stone');
      SB.HUT(world, 1250, 352, 'wood');
      SB.PIG(world, 1080, 620);
      SB.PIG(world, 1250, 486);
      SB.PIG(world, 1250, 352);
    }
  },
  {
    id: 8,
    name: '유리 성',
    birds: ['red', 'red', 'yellow', 'black'],
    build(world) {
      SB.HUT(world, 1050, 620, 'glass');
      SB.HUT(world, 1350, 620, 'glass');
      SB.H(world, 1200, 486, 420, 'stone');
      SB.PIG(world, 1050, 620);
      SB.PIG(world, 1350, 620);
      SB.PIG(world, 1200, 462);
    }
  },
  {
    id: 9,
    name: '요새',
    birds: ['red', 'yellow', 'black', 'yellow', 'red'],
    build(world) {
      SB.HUT(world, 1000, 620, 'stone');
      SB.HUT(world, 1300, 620, 'stone');
      SB.H(world, 1150, 486, 420, 'stone');
      SB.HUT(world, 1150, 462, 'wood');
      SB.HUT(world, 1620, 620, 'wood');
      SB.PIG(world, 1000, 620);
      SB.PIG(world, 1300, 620);
      SB.PIG(world, 1150, 462);
      SB.PIG(world, 1620, 620);
      SB.PIG(world, 1150, 328);
    }
  },
  {
    id: 10,
    name: '최종 요새',
    birds: ['red', 'yellow', 'black', 'yellow', 'black'],
    build(world) {
      SB.HUT(world, 950, 620, 'stone');
      SB.HUT(world, 1250, 620, 'stone');
      SB.HUT(world, 1550, 620, 'stone');
      SB.H(world, 1100, 486, 340, 'stone');
      SB.H(world, 1400, 486, 340, 'stone');
      SB.HUT(world, 1250, 462, 'wood');
      SB.PIG(world, 950, 620);
      SB.PIG(world, 1250, 620);
      SB.PIG(world, 1550, 620);
      SB.PIG(world, 1250, 462);
      SB.PIG(world, 1250, 328);
    }
  }
];
