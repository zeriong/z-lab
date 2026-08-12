import Matter from 'matter-js';
import { MATERIALS } from '../physics/materials.js';
import { CATEGORY } from '../physics/world.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT, PIG_RADIUS_DEFAULT } from '../config.js';

const { Bodies, Composite } = Matter;

/**
 * 계획서 §5-1 스테이지 JSON 스키마.
 * @typedef {Object} BlockDef
 * @property {'box'|'circle'} type
 * @property {'wood'|'stone'|'ice'} material
 * @property {number} x
 * @property {number} y
 * @property {number} [w] - type === 'box'일 때 너비, type === 'circle'일 때 지름 대체값
 * @property {number} [h] - type === 'box'일 때 높이
 * @property {number} [radius] - type === 'circle'일 때 반지름(없으면 w/2 사용)
 * @property {number} [angle] - degrees
 *
 * @typedef {Object} PigDef
 * @property {number} x
 * @property {number} y
 * @property {number} [radius]
 *
 * @typedef {Object} StageData
 * @property {number} id
 * @property {string} name
 * @property {number} birdCount
 * @property {('normal')[]} birdOrder
 * @property {{x: number, y: number}} slingshotAnchor
 * @property {number} groundY
 * @property {{oneStar: number, twoStar: number, threeStar: number}} targetScore
 * @property {BlockDef[]} blocks
 * @property {PigDef[]} pigs
 * @property {string} background
 *
 * @typedef {Object} StageState
 * @property {number} id
 * @property {string} name
 * @property {string[]} birdOrder
 * @property {number} birdCount
 * @property {{x: number, y: number}} slingshotAnchor
 * @property {number} groundY
 * @property {{oneStar: number, twoStar: number, threeStar: number}} targetScore
 * @property {string} background
 * @property {Matter.Body[]} blocks
 * @property {Matter.Body[]} pigs
 * @property {Matter.Body} groundBody
 * @property {Matter.Body[]} spentBirds - 정지/제거되어 더 이상 조작되지 않는 새(렌더용, §8 마일스톤3)
 */

// Vite의 정적 분석 가능한 glob import — 10개 스테이지 JSON을 한 번에 로드한다(§5-1).
const stageModules = import.meta.glob('./stages/*.json', { eager: true });

function stagePath(stageId) {
  return `./stages/stage-${String(stageId).padStart(2, '0')}.json`;
}

/**
 * 스테이지 id로 정적 JSON 데이터를 조회한다.
 * @param {number} stageId
 * @returns {StageData}
 */
export function loadStageData(stageId) {
  const mod = stageModules[stagePath(stageId)];
  if (!mod) throw new Error(`stage not found: ${stageId}`);
  return mod.default ?? mod;
}

/**
 * 기존 world의 모든 바디를 제거한다(§5-2 — 스테이지 간 상태 누수 방지, keepStatic=false로 지형까지 제거).
 * @param {Matter.World} world
 */
export function clearWorld(world) {
  Composite.clear(world, false);
}

/**
 * 스테이지 JSON으로부터 world에 지형/블록/돼지 바디를 구성한다.
 * @param {Matter.World} world
 * @param {StageData} stageData
 * @returns {StageState}
 */
export function buildStageWorld(world, stageData) {
  const groundBody = Bodies.rectangle(
    CANVAS_WIDTH / 2,
    stageData.groundY + (CANVAS_HEIGHT - stageData.groundY) / 2,
    CANVAS_WIDTH,
    CANVAS_HEIGHT - stageData.groundY,
    {
      isStatic: true,
      friction: 0.8,
      collisionFilter: { category: CATEGORY.GROUND },
      plugin: { role: 'ground' },
    }
  );

  const blocks = stageData.blocks.map((def) => createBlockBody(def));
  const pigs = stageData.pigs.map((def) => createPigBody(def));

  Composite.add(world, [groundBody, ...blocks, ...pigs]);

  return {
    id: stageData.id,
    name: stageData.name,
    birdOrder: stageData.birdOrder,
    birdCount: stageData.birdCount,
    slingshotAnchor: { ...stageData.slingshotAnchor },
    groundY: stageData.groundY,
    targetScore: stageData.targetScore,
    background: stageData.background,
    blocks,
    pigs,
    groundBody,
    spentBirds: [],
  };
}

function createBlockBody(def) {
  const material = MATERIALS[def.material];
  const angleRad = ((def.angle ?? 0) * Math.PI) / 180;
  const common = {
    angle: angleRad,
    density: material.density,
    friction: material.friction,
    restitution: material.restitution,
    collisionFilter: { category: CATEGORY.BLOCK },
  };

  if (def.type === 'circle') {
    const radius = def.radius ?? def.w / 2;
    const body = Bodies.circle(def.x, def.y, radius, common);
    body.plugin = {
      role: 'block',
      material: def.material,
      hp: material.hp,
      maxHp: material.hp,
      shape: 'circle',
      radius,
    };
    return body;
  }

  const body = Bodies.rectangle(def.x, def.y, def.w, def.h, common);
  body.plugin = {
    role: 'block',
    material: def.material,
    hp: material.hp,
    maxHp: material.hp,
    shape: 'box',
    width: def.w,
    height: def.h,
  };
  return body;
}

function createPigBody(def) {
  const radius = def.radius ?? PIG_RADIUS_DEFAULT;
  const body = Bodies.circle(def.x, def.y, radius, {
    density: 0.001,
    friction: 0.5,
    restitution: 0.2,
    collisionFilter: { category: CATEGORY.PIG },
  });
  body.plugin = { role: 'pig', radius };
  return body;
}
