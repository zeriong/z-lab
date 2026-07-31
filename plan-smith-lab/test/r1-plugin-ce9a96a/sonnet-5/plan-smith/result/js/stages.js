var AB = window.AB || (window.AB = {});

// Step 0 -- structure representation schema (body shape + material + joints
// + spawn coordinates) -- and Step 4 -- 10 data-driven stage instances built
// from that schema. Coordinates, materials and body sizes below are
// declared-arbitrary placeholders (art is placeholder-shape only per the
// plan's explicit assumption); only the schema shape and the 10-stage count
// are load-bearing.

AB.CONFIG = {
  width: 960,
  height: 540,
  groundY: 460,
  slingAnchor: { x: 150, y: 360 },
  gravity: 900 // px/s^2, declared arbitrary, pending first fps/feel measurement
};

AB.Physics_MATERIALS = {
  wood: { density: 0.8, restitution: 0.15, friction: 0.6, breakImpulse: 55 },
  stone: { density: 2.0, restitution: 0.05, friction: 0.8, breakImpulse: 110 },
  ice: { density: 0.6, restitution: 0.05, friction: 0.15, breakImpulse: 35 }
};

AB.Stages = (function () {
  const MATERIALS = AB.Physics_MATERIALS;
  const G = AB.CONFIG;

  // -- schema-instance helpers (still data: they only assemble plain
  // {id,x,y,w,h,material} / {a,b,breakDistance} objects, no engine calls) --

  function towerBlocks(idPrefix, cx, count, material, w, h) {
    const blocks = [];
    for (let i = 0; i < count; i++) {
      blocks.push({ id: idPrefix + i, x: cx, y: G.groundY - h / 2 - i * h, w: w, h: h, material: material });
    }
    return { blocks: blocks, topY: G.groundY - count * h };
  }

  function bridgeSetup(idPrefix, leftX, rightX, y, count, material, plankW, plankH) {
    const blocks = [];
    const joints = [];
    const anchors = [
      { id: idPrefix + 'aL', x: leftX - plankW / 2, y: y },
      { id: idPrefix + 'aR', x: rightX + plankW / 2, y: y }
    ];
    const step = count > 1 ? (rightX - leftX) / (count - 1) : 0;
    for (let i = 0; i < count; i++) {
      blocks.push({ id: idPrefix + 'p' + i, x: leftX + step * i, y: y, w: plankW, h: plankH, material: material });
    }
    joints.push({ a: idPrefix + 'aL', b: idPrefix + 'p0', breakDistance: 20 });
    for (let i = 0; i < count - 1; i++) {
      joints.push({ a: idPrefix + 'p' + i, b: idPrefix + 'p' + (i + 1), breakDistance: 20 });
    }
    joints.push({ a: idPrefix + 'p' + (count - 1), b: idPrefix + 'aR', breakDistance: 20 });
    return { blocks: blocks, joints: joints, anchors: anchors, y: y };
  }

  const BIRD_R = 14;
  const PIG_R = 14;

  // -- 10 stage instances (data only) ---------------------------------------
  const STAGES = [];

  // Stage 1: single wood block, pig on top. Intro.
  (function () {
    const t = towerBlocks('s1_', 570, 1, 'wood', 40, 40);
    STAGES.push({
      seed: 1001, birdCount: 2, birdRadius: BIRD_R,
      blocks: t.blocks, joints: [], anchors: [],
      pigs: [{ x: 570, y: t.topY - PIG_R, r: PIG_R }]
    });
  })();

  // Stage 2: 2-block wood tower + a second pig on the ground beside it.
  (function () {
    const t = towerBlocks('s2_', 580, 2, 'wood', 40, 40);
    STAGES.push({
      seed: 1002, birdCount: 2, birdRadius: BIRD_R,
      blocks: t.blocks, joints: [], anchors: [],
      pigs: [
        { x: 580, y: t.topY - PIG_R, r: PIG_R },
        { x: 480, y: G.groundY - PIG_R, r: PIG_R }
      ]
    });
  })();

  // Stage 3: 3-block wood tower, single pig on top.
  (function () {
    const t = towerBlocks('s3_', 590, 3, 'wood', 40, 40);
    STAGES.push({
      seed: 1003, birdCount: 3, birdRadius: BIRD_R,
      blocks: t.blocks, joints: [], anchors: [],
      pigs: [{ x: 590, y: t.topY - PIG_R, r: PIG_R }]
    });
  })();

  // Stage 4: two separate single-block targets.
  (function () {
    const t1 = towerBlocks('s4a_', 560, 1, 'wood', 40, 40);
    const t2 = towerBlocks('s4b_', 650, 1, 'wood', 40, 40);
    STAGES.push({
      seed: 1004, birdCount: 3, birdRadius: BIRD_R,
      blocks: t1.blocks.concat(t2.blocks), joints: [], anchors: [],
      pigs: [
        { x: 560, y: t1.topY - PIG_R, r: PIG_R },
        { x: 650, y: t2.topY - PIG_R, r: PIG_R }
      ]
    });
  })();

  // Stage 5: 2-block stone tower (tougher material), pig on top.
  (function () {
    const t = towerBlocks('s5_', 600, 2, 'stone', 40, 40);
    STAGES.push({
      seed: 1005, birdCount: 3, birdRadius: BIRD_R,
      blocks: t.blocks, joints: [], anchors: [],
      pigs: [{ x: 600, y: t.topY - PIG_R, r: PIG_R }]
    });
  })();

  // Stage 6: wood plank bridge (joints), pig standing on the bridge + one on ground.
  (function () {
    const br = bridgeSetup('s6_', 500, 650, 400, 4, 'wood', 55, 14);
    STAGES.push({
      seed: 1006, birdCount: 3, birdRadius: BIRD_R,
      blocks: br.blocks, joints: br.joints, anchors: br.anchors,
      pigs: [
        { x: 575, y: br.y - 7 - PIG_R, r: PIG_R },
        { x: 460, y: G.groundY - PIG_R, r: PIG_R }
      ]
    });
  })();

  // Stage 7: mixed-material tower (stone base + wood on top), pig on top.
  (function () {
    const base = towerBlocks('s7base_', 620, 1, 'stone', 44, 40);
    const upper = towerBlocks('s7up_', 620, 2, 'wood', 40, 40);
    upper.blocks.forEach(function (b, i) { b.y = base.topY - 20 - i * 40; b.id = 's7up_' + i; });
    const topY = base.topY - 20 - 2 * 40;
    STAGES.push({
      seed: 1007, birdCount: 3, birdRadius: BIRD_R,
      blocks: base.blocks.concat(upper.blocks), joints: [], anchors: [],
      pigs: [{ x: 620, y: topY - PIG_R, r: PIG_R }]
    });
  })();

  // Stage 8: bridge leading into a tower; pig on the tower, pig on the bridge.
  (function () {
    const br = bridgeSetup('s8_', 520, 620, 410, 3, 'wood', 55, 14);
    const t = towerBlocks('s8t_', 700, 2, 'wood', 40, 40);
    STAGES.push({
      seed: 1008, birdCount: 4, birdRadius: BIRD_R,
      blocks: br.blocks.concat(t.blocks), joints: br.joints, anchors: br.anchors,
      pigs: [
        { x: 570, y: br.y - 7 - PIG_R, r: PIG_R },
        { x: 700, y: t.topY - PIG_R, r: PIG_R }
      ]
    });
  })();

  // Stage 9: tall wood tower with a stone cap, plus a nearby ice obstacle.
  (function () {
    const t = towerBlocks('s9_', 630, 4, 'wood', 40, 36);
    const cap = { id: 's9cap', x: 630, y: t.topY - 20, w: 44, h: 40, material: 'stone' };
    const ice = { id: 's9ice', x: 350, y: G.groundY - 20, w: 40, h: 40, material: 'ice' };
    STAGES.push({
      seed: 1009, birdCount: 4, birdRadius: BIRD_R,
      blocks: t.blocks.concat([cap, ice]), joints: [], anchors: [],
      pigs: [{ x: 630, y: t.topY - 40 - PIG_R, r: PIG_R }]
    });
  })();

  // Stage 10: final -- two towers (stone + wood) each with a pig, plus a
  // bridge between them with a pig underneath/on top. 3 pigs total.
  (function () {
    const t1 = towerBlocks('s10a_', 580, 2, 'stone', 40, 40);
    const t2 = towerBlocks('s10b_', 700, 3, 'wood', 40, 40);
    const br = bridgeSetup('s10br_', 620, 680, 410, 3, 'wood', 40, 14);
    STAGES.push({
      seed: 1010, birdCount: 5, birdRadius: BIRD_R,
      blocks: t1.blocks.concat(t2.blocks, br.blocks), joints: br.joints, anchors: br.anchors,
      pigs: [
        { x: 580, y: t1.topY - PIG_R, r: PIG_R },
        { x: 700, y: t2.topY - PIG_R, r: PIG_R },
        { x: 650, y: br.y - 7 - PIG_R, r: PIG_R }
      ]
    });
  })();

  // Consumes a stage's plain data and creates the actual physics bodies for it.
  function build(world, data) {
    const groundHeight = 300;
    world.add(AB.Physics.createBox({
      x: G.width / 2, y: G.groundY + groundHeight / 2,
      width: G.width + 80, height: groundHeight,
      isStatic: true, restitution: 0.1, friction: 0.9,
      tag: 'ground', material: 'stone', breakImpulse: Infinity
    }));

    const idMap = {};

    (data.anchors || []).forEach(function (a) {
      const body = AB.Physics.createCircle({
        x: a.x, y: a.y, radius: 6, isStatic: true, tag: 'anchor', breakImpulse: Infinity
      });
      idMap[a.id] = body;
      world.add(body);
    });

    data.blocks.forEach(function (b) {
      const mat = MATERIALS[b.material] || MATERIALS.wood;
      const body = AB.Physics.createBox({
        x: b.x, y: b.y, width: b.w, height: b.h, angle: b.angle || 0,
        density: mat.density, restitution: mat.restitution, friction: mat.friction,
        breakImpulse: mat.breakImpulse, material: b.material, tag: 'block'
      });
      idMap[b.id] = body;
      world.add(body);
    });

    (data.joints || []).forEach(function (j) {
      const a = idMap[j.a], b = idMap[j.b];
      if (!a || !b) return;
      const length = j.length != null ? j.length : Math.hypot(b.x - a.x, b.y - a.y);
      world.addJoint({ a: a, b: b, length: length, breakDistance: j.breakDistance != null ? j.breakDistance : 16, broken: false });
    });

    data.pigs.forEach(function (p) {
      world.add(AB.Physics.createCircle({
        x: p.x, y: p.y, radius: p.r || PIG_R,
        density: 1, restitution: 0.3, friction: 0.5,
        tag: 'pig', breakImpulse: AB.Judge.BREAK_IMPULSE.pig
      }));
    });

    return {
      pigCount: data.pigs.length,
      birdCount: data.birdCount,
      birdRadius: data.birdRadius || BIRD_R
    };
  }

  return { list: STAGES, build: build };
})();

// Convenience alias used by main.js / ui.js.
AB.STAGES = AB.Stages.list;
