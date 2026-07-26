/* stages.js — data-driven stage definitions (Anchor A4).
 * Adding a stage = adding data here. Engine code stays untouched.
 *
 * World is 1280 x 720. Ground surface (top) is at y = 660.
 * Slingshot anchor is at (230, 468); structures live to its right.
 *
 * Schema per stage:
 *   { id, name, birds, blocks:[{type,x,y,w,h,angle}], pigs:[{x,y,r}] }
 *   type ∈ 'wood' | 'stone' | 'ice'   (material -> density / health / look)
 *   x,y  = body centre.  angle in radians (default 0).
 */
(function () {
  const G = 660; // ground top y

  // --- tiny authoring helpers (data layer, not engine) ---
  const B = (type, x, y, w, h, angle) => ({ type, x, y, w, h, angle: angle || 0 });
  const P = (x, y) => ({ x, y, r: 22 });

  // vertical column resting on the ground
  const col = (type, x, h) => B(type, x, G - h / 2, 26, h);
  // box resting so its bottom sits at surface `base` (base defaults to ground)
  const box = (type, x, size, base) => B(type, x, (base || G) - size / 2, size, size);

  // A hut: two columns + a roof plank, with a pig sheltered inside.
  function hut(cx, type) {
    type = type || 'wood';
    const h = 118, half = 52;
    const roofTop = G - h;                 // y of column tops
    return {
      blocks: [
        col(type, cx - half, h),
        col(type, cx + half, h),
        B(type, cx, roofTop - 12, half * 2 + 30, 24),
      ],
      pigInside: P(cx, G - 24),
      roofY: roofTop - 24,                 // top surface of the roof plank
    };
  }

  const STAGES = [
    // 1 — Warm up: one pig in the open.
    {
      id: 1, name: 'First Bite', birds: 3,
      blocks: [box('wood', 760, 46)],
      pigs: [P(900, G - 22)],
    },

    // 2 — Two little pigs behind a short wall.
    {
      id: 2, name: 'Two Little Pigs', birds: 3,
      blocks: [box('wood', 740, 46), box('wood', 740, 46, G - 46)],
      pigs: [P(840, G - 22), P(1000, G - 22)],
    },

    // 3 — A hut: pig inside, pig on the roof.
    (function () {
      const h = hut(900, 'wood');
      return {
        id: 3, name: 'Little House', birds: 4,
        blocks: h.blocks,
        pigs: [h.pigInside, P(900, h.roofY - 22)],
      };
    })(),

    // 4 — Twin towers, a pig crowning each, one guarding the gate.
    {
      id: 4, name: 'Twin Towers', birds: 4,
      blocks: [
        box('wood', 780, 46), box('wood', 780, 46, G - 46), box('wood', 780, 46, G - 92),
        box('wood', 1050, 46), box('wood', 1050, 46, G - 46), box('wood', 1050, 46, G - 92),
      ],
      pigs: [P(780, G - 138 - 22), P(1050, G - 138 - 22), P(915, G - 22)],
    },

    // 5 — Ice pyramid, a pig perched on top and one in the open.
    {
      id: 5, name: 'Glass Pyramid', birds: 5,
      blocks: [
        box('ice', 820, 46), box('ice', 866, 46), box('ice', 912, 46), box('ice', 958, 46),
        box('ice', 843, 46, G - 46), box('ice', 889, 46, G - 46), box('ice', 935, 46, G - 46),
        box('ice', 866, 46, G - 92), box('ice', 912, 46, G - 92),
        box('ice', 889, 46, G - 138),
      ],
      pigs: [P(700, G - 22), P(889, G - 184 - 22)],
    },

    // 6 — Stone rampart. Two pigs sheltered behind, one on the wall.
    {
      id: 6, name: 'The Rampart', birds: 6,
      blocks: [
        col('stone', 882, 118), col('stone', 918, 118),
        B('stone', 900, G - 118 - 13, 120, 26),
        box('wood', 1060, 46),
      ],
      pigs: [P(900, G - 118 - 26 - 22), P(1080, G - 22), P(1160, G - 22)],
    },

    // 7 — A hamlet: two huts, three pigs.
    (function () {
      const a = hut(780, 'wood'), b = hut(1010, 'ice');
      return {
        id: 7, name: 'The Hamlet', birds: 8,
        blocks: [...a.blocks, ...b.blocks],
        pigs: [a.pigInside, b.pigInside, P(780, a.roofY - 22)],
      };
    })(),

    // 8 — A bridge slung between two columns.
    {
      id: 8, name: 'The Bridge', birds: 6,
      blocks: [
        col('wood', 740, 118), col('wood', 1060, 118),
        B('wood', 900, G - 118 - 12, 360, 24),
      ],
      pigs: [P(900, G - 118 - 24 - 22), P(660, G - 22), P(1030, G - 22)],
    },

    // 9 — Fortress: a thick stone rampart to arc over, plus a wood hut.
    (function () {
      const h = hut(1050, 'ice');
      return {
        id: 9, name: 'The Fortress', birds: 7,
        blocks: [
          col('stone', 762, 140), col('stone', 808, 140),   // thick stone wall ~785
          B('stone', 785, G - 140 - 13, 120, 26),            // battlement cap
          box('ice', 900, 46),                               // guard block
          ...h.blocks,
        ],
        pigs: [
          P(785, G - 140 - 26 - 22),   // atop the rampart
          P(930, G - 22),              // sheltered behind it (arc over)
          h.pigInside,                 // inside the wood hut
          P(600, G - 22),              // in the open
        ],
      };
    })(),

    // 10 — The castle: five pigs across three strongholds (all reachable).
    (function () {
      const left = hut(700, 'wood');
      return {
        id: 10, name: 'The Castle', birds: 7,
        blocks: [
          ...left.blocks,
          col('stone', 922, 130), col('stone', 982, 130),   // central battlement
          B('stone', 952, G - 130 - 14, 150, 28),
          box('ice', 1170, 46), box('ice', 1170, 46, G - 46), box('ice', 1170, 46, G - 92),
        ],
        pigs: [
          left.pigInside,                 // inside the wood hut
          P(952, G - 130 - 28 - 22),      // atop the battlement
          P(1070, G - 22),                // behind the battlement (arc over)
          P(1170, G - 138 - 22),          // crowning the ice tower
          P(600, G - 22),                 // in the open
        ],
      };
    })(),
  ];

  window.STAGES = STAGES;
})();
