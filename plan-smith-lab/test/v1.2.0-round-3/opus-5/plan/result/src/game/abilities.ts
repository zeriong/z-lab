/**
 * §4.3 / §6.2 새 능력. yellow = 진행 방향 가속(1회), black = 폭발(탭 또는 첫 충돌 0.6초 후).
 * 능력은 새 1마리당 정확히 1회만 발동한다(abilityUsed 플래그).
 */

import { Body, Composite, Vector } from 'matter-js';
import type { GameWorld } from './world';
import {
  BLACK_FUSE_STEPS,
  EXPLOSION_POWER,
  EXPLOSION_RADIUS,
  YELLOW_BOOST,
  getGame,
} from './entities';
import { explode } from './damage';

export interface AbilityResult {
  used: boolean;
  kind: 'none' | 'boost' | 'bomb';
  x: number;
  y: number;
}

const NONE: AbilityResult = { used: false, kind: 'none', x: 0, y: 0 };

/** FLYING 중 탭/Space로 능력 발동. */
export function triggerAbility(gw: GameWorld): AbilityResult {
  const bird = gw.bird;
  if (!bird) return NONE;
  const g = getGame(bird);
  if (!g || g.abilityUsed || !g.birdType) return NONE;
  if (gw.launchStep < 0) return NONE; // 아직 발사 전

  if (g.birdType === 'yellow') {
    g.abilityUsed = true;
    Body.setVelocity(bird, Vector.mult(bird.velocity, YELLOW_BOOST));
    return { used: true, kind: 'boost', x: bird.position.x, y: bird.position.y };
  }

  if (g.birdType === 'black') {
    g.abilityUsed = true;
    return detonate(gw, bird);
  }

  return NONE;
}

/** 매 스텝 호출 — black bird의 자동 퓨즈(첫 충돌 후 0.6초). */
export function tickAbilities(gw: GameWorld): AbilityResult {
  const bird = gw.bird;
  if (!bird) return NONE;
  const g = getGame(bird);
  if (!g || g.abilityUsed || g.birdType !== 'black') return NONE;
  if (g.firstHitStep === undefined || g.firstHitStep < 0) return NONE;
  if (gw.step - g.firstHitStep < BLACK_FUSE_STEPS) return NONE;

  g.abilityUsed = true;
  return detonate(gw, bird);
}

function detonate(gw: GameWorld, bird: Body): AbilityResult {
  const at = { x: bird.position.x, y: bird.position.y };
  explode(gw, at, EXPLOSION_RADIUS, EXPLOSION_POWER);
  // 폭발한 새는 사라진다. FLYING 감시자가 gw.bird === null을 보고 SETTLING으로 넘긴다.
  Composite.remove(gw.engine.world, bird);
  gw.bird = null;
  return { used: true, kind: 'bomb', x: at.x, y: at.y };
}
