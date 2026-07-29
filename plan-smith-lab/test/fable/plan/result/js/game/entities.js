// 엔티티 팩토리: Bird / Pig / Block(재질별). 게임 메타데이터는 body.plugin.ab에 부착.

import { BIRD_RADIUS } from '../constants.js';

const { Bodies, Body } = Matter;

export const MATERIALS = {
  ice: { hp: 40, density: 0.0008, color: '#aadcf2', edge: '#6fb4d8', shine: '#e2f6ff' },
  wood: { hp: 90, density: 0.001, color: '#c98f4e', edge: '#8f6230', shine: '#e0b075' },
  stone: { hp: 260, density: 0.002, color: '#9aa0a6', edge: '#61666c', shine: '#c1c6cb' },
};

export function createBlock(def) {
  const m = MATERIALS[def.material];
  const body = Bodies.rectangle(def.x, def.y, def.w, def.h, {
    angle: def.angle || 0,
    density: m.density,
    friction: 0.6,
    restitution: 0.05,
  });
  body.plugin.ab = {
    kind: 'block',
    material: def.material,
    hp: m.hp,
    maxHp: m.hp,
    w: def.w,
    h: def.h,
  };
  return body;
}

export function createPig(def) {
  const r = def.r || 22;
  const body = Bodies.circle(def.x, def.y, r, {
    density: 0.0009,
    friction: 0.5,
    restitution: 0.2,
  });
  body.plugin.ab = { kind: 'pig', hp: 60, maxHp: 60, r };
  return body;
}

export function createBird(x, y) {
  // 동적으로 생성한 뒤 setStatic(true): 나중에 setStatic(false)로 풀 때
  // 원래 질량/관성이 정확히 복원되도록 하기 위함.
  const body = Bodies.circle(x, y, BIRD_RADIUS, {
    density: 0.004,
    friction: 0.6,
    restitution: 0.35,
  });
  Body.setStatic(body, true);
  body.plugin.ab = { kind: 'bird', r: BIRD_RADIUS, state: 'loaded' }; // loaded | dragging | flying
  return body;
}
