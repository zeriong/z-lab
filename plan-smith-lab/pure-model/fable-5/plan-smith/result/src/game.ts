// 게임 규칙 코어 — 스테이지 로드(M2), 슬링샷(M6·M7), 궤적(M8), 데미지(M9·M10),
// 턴 종료(M11), 판정(M12), 점수·별(M13), 페이즈 머신(§5).
// 이 파일은 Matter를 import하지 않는다 — physics.ts 어댑터만 사용 (§13 격리 규칙).

import type { Phase, Stage } from './types';
import { BIRD, CFG, MATERIALS, PIG, SCORE, SLING, WORLD } from './config';
import { PhysicsWorld } from './physics';
import { STAGES } from './stages';
import { recordClear } from './save';
import { Effects } from './effects';
import * as audio from './audio';
import { goTo, onScene, scene } from './scene';
import type { Material } from './types';

export interface BlockEnt {
  kind: 'block';
  bodyId: number;
  material: Material;
  hp: number;
  maxHp: number;
  w: number;
  h: number;
}
export interface PigEnt {
  kind: 'pig';
  bodyId: number;
  hp: number;
  maxHp: number;
  r: number;
}
export interface BirdEnt {
  kind: 'bird';
  bodyId: number;
  r: number;
}
export type Entity = BlockEnt | PigEnt | BirdEnt;

export class Game {
  readonly physics = new PhysicsWorld();
  readonly effects = new Effects();
  /** bodyId → 엔티티 태그 (§9 h4: 충돌 핸들러가 바디를 엔티티로 식별) */
  readonly entities = new Map<number, Entity>();

  stageId = 1;
  stage: Stage | null = null;
  phase: Phase = 'AIMING';
  birdsLeft = 0;
  remainingPigs = 0;
  score = 0;
  /** AIMING 중 패드 위 새(아직 물리 바디 아님 — 발사 시 바디 생성) */
  birdPos = { x: SLING.x, y: SLING.y };
  dragging = false;
  activeBirdId: number | null = null;
  lastResult: { stars: number; score: number } | null = null;

  /** 턴 시간은 시뮬레이션 누적기로만 계산 — PAUSED 동안 타임아웃도 같이 멈춘다 (§11) */
  private turnElapsed = 0;
  private stillFrames = 0;
  /** 충돌 이벤트 중 바디 제거를 피하기 위한 지연 큐 */
  private destroyQueue: number[] = [];

  constructor() {
    // 충돌 핸들러 1회 등록 (§9 콜드스타트 — 재등록 안 함)
    this.physics.onCollision((a, b, sev) => this.onCollision(a, b, sev));
    // 씬 전이 구독: PLAYING 진입 + stage 지정 시에만 월드 재조립 (M2).
    // stage 없는 PLAYING 진입은 PAUSED→계속하기 재개 — 월드 그대로 (M18).
    onScene((to, _from, data) => {
      if (to === 'PLAYING' && typeof data.stage === 'number') this.loadStage(data.stage);
      if (to === 'PAUSED') {
        // 드래그 중 일시정지 → 조준만 리셋(물리 상태는 건드리지 않는다)
        this.dragging = false;
        this.birdPos = { x: SLING.x, y: SLING.y };
      }
    });
  }

  /** 스테이지 로드 — 월드를 비우고 데이터의 바디들을 조립, 조준 상태로 시작 (M2) */
  loadStage(n: number): void {
    const stage = STAGES.find((s) => s.id === n);
    if (!stage) return;
    this.stageId = n;
    this.stage = stage;
    this.physics.clear();
    this.entities.clear();
    this.effects.reset();
    this.destroyQueue = [];

    // 지형: 평지 (§5 — 별도 지형 시스템 없음)
    this.physics.addBox(
      WORLD.width / 2,
      WORLD.groundY + WORLD.groundThickness / 2,
      WORLD.width + 800,
      WORLD.groundThickness,
      0,
      { isStatic: true, friction: 0.9 },
    );

    for (const b of stage.blocks) {
      const m = MATERIALS[b.material];
      const id = this.physics.addBox(b.x, b.y, b.w, b.h, b.angle, {
        density: m.density,
        friction: 0.6,
        restitution: 0,
      });
      this.entities.set(id, {
        kind: 'block',
        bodyId: id,
        material: b.material,
        hp: m.hp,
        maxHp: m.hp,
        w: b.w,
        h: b.h,
      });
    }
    for (const p of stage.pigs) {
      const id = this.physics.addCircle(p.x, p.y, p.r, {
        density: PIG.density,
        friction: 0.5,
        restitution: 0.1,
      });
      this.entities.set(id, { kind: 'pig', bodyId: id, hp: PIG.hp, maxHp: PIG.hp, r: p.r });
    }

    this.birdsLeft = stage.birds; // 콜드스타트: loadStage가 birds로 설정 (§9)
    this.remainingPigs = stage.pigs.length; // 콜드스타트: pigs.length로 설정 (§9)
    this.score = 0;
    this.lastResult = null;
    this.activeBirdId = null;
    this.dragging = false;
    this.birdPos = { x: SLING.x, y: SLING.y };
    this.phase = 'AIMING'; // 콜드스타트: loadStage가 AIMING 설정 (§9)
    this.turnElapsed = 0;
    this.stillFrames = 0;
  }

  // ── 입력 (M6) — 리스너는 부트스트랩에서 1회 바인딩, 여기서는 가드만 (§9) ──

  /** 슬링샷 입력은 PLAYING && AIMING에서만 수용 (§5) */
  pointerDown(x: number, y: number): void {
    if (scene() !== 'PLAYING' || this.phase !== 'AIMING' || this.birdsLeft <= 0) return;
    if (Math.hypot(x - this.birdPos.x, y - this.birdPos.y) <= CFG.grabRadius) {
      this.dragging = true;
      this.pointerMove(x, y);
    }
  }

  pointerMove(x: number, y: number): void {
    if (!this.dragging || scene() !== 'PLAYING' || this.phase !== 'AIMING') return;
    let dx = x - SLING.x;
    let dy = y - SLING.y;
    const len = Math.hypot(dx, dy);
    if (len > CFG.maxDrag) {
      // 최대 당김 120px 클램프 (§5)
      dx *= CFG.maxDrag / len;
      dy *= CFG.maxDrag / len;
    }
    this.birdPos = { x: SLING.x + dx, y: SLING.y + dy };
  }

  pointerUp(): void {
    if (!this.dragging) return;
    this.dragging = false;
    const dx = this.birdPos.x - SLING.x;
    const dy = this.birdPos.y - SLING.y;
    const pull = Math.hypot(dx, dy);
    if (scene() === 'PLAYING' && this.phase === 'AIMING' && pull >= CFG.minLaunchPull) {
      this.launch(dx, dy);
    } else {
      this.birdPos = { x: SLING.x, y: SLING.y };
    }
  }

  /** 발사 (M7): v0 = −k·d, setVelocity + frictionAir=0 — 궤적 예측과 수식 공유 (§5, §10) */
  private launch(dx: number, dy: number): void {
    const id = this.physics.addCircle(this.birdPos.x, this.birdPos.y, BIRD.r, {
      density: BIRD.density,
      friction: BIRD.friction,
      restitution: BIRD.restitution,
      frictionAir: 0,
    });
    this.physics.setVelocity(id, -CFG.launchK * dx, -CFG.launchK * dy);
    this.entities.set(id, { kind: 'bird', bodyId: id, r: BIRD.r });
    this.activeBirdId = id;
    this.birdsLeft--;
    this.phase = 'FLYING';
    this.turnElapsed = 0;
    this.stillFrames = 0;
    audio.playLaunch();
  }

  /** 궤적 예측 점선 (M8) — 폐형식 등가속 공식. 발사와 동일 수식(v0=−k·d, g=틱당 중력) */
  trajectory(): { x: number; y: number }[] {
    if (!this.dragging) return [];
    const dx = this.birdPos.x - SLING.x;
    const dy = this.birdPos.y - SLING.y;
    if (Math.hypot(dx, dy) < CFG.minLaunchPull) return [];
    const vx = -CFG.launchK * dx;
    const vy = -CFG.launchK * dy;
    const g = this.physics.gravityPerTick;
    const pts: { x: number; y: number }[] = [];
    for (let i = 1; i <= CFG.trajPoints; i++) {
      const t = i * CFG.trajTickStep; // 틱 단위
      pts.push({
        x: this.birdPos.x + vx * t,
        y: this.birdPos.y + vy * t + 0.5 * g * t * t,
      });
    }
    return pts;
  }

  // ── 데미지 (M9·M10) ──

  private onCollision(aId: number, bId: number, severity: number): void {
    if (scene() !== 'PLAYING') return;
    // 발사된 새의 첫 접촉 → FLYING에서 SETTLING으로 (§5 페이즈)
    if (this.phase === 'FLYING' && (aId === this.activeBirdId || bId === this.activeBirdId)) {
      this.phase = 'SETTLING';
    }
    if (severity > 2) audio.playHit(severity);
    this.applyDamage(aId, severity);
    this.applyDamage(bId, severity);
  }

  /** §5 데미지 모델: severity > 임계 → hp -= (severity − 임계). hp ≤ 0 → 제거 큐 */
  private applyDamage(id: number, severity: number): void {
    const e = this.entities.get(id);
    if (!e) return; // 지면·미등록 바디는 데미지 표면이 아니다
    if (e.kind === 'block') {
      const th = MATERIALS[e.material].threshold;
      if (severity > th) {
        e.hp -= severity - th;
        if (e.hp <= 0) this.destroyQueue.push(id);
      }
    } else if (e.kind === 'pig') {
      if (severity > PIG.threshold) {
        e.hp -= severity - PIG.threshold;
        if (e.hp <= 0) this.destroyQueue.push(id);
      }
    }
    // 새는 파괴 대상이 아니다 — 턴 종료 시 회수
  }

  /** 제거 + 이펙트 + 점수 — 모든 파괴는 시각+청각+점수 팝업 셋으로 응답 (§3 바닥선) */
  private processDestroyQueue(): void {
    if (this.destroyQueue.length === 0) return;
    for (const id of this.destroyQueue) {
      const e = this.entities.get(id);
      if (!e) continue; // 중복 큐잉 방어
      const s = this.physics.get(id);
      const x = s ? s.x : 0;
      const y = s ? s.y : 0;
      this.entities.delete(id);
      this.physics.remove(id);
      if (e.kind === 'block') {
        this.score += SCORE.block;
        this.effects.burst(x, y, MATERIALS[e.material].color);
        this.effects.popup(x, y, `+${SCORE.block}`);
        audio.playBreak(e.material);
      } else if (e.kind === 'pig') {
        this.remainingPigs--;
        this.score += SCORE.pig;
        this.effects.burst(x, y, PIG.color);
        this.effects.popup(x, y, `+${SCORE.pig}`);
        audio.playPig();
      }
    }
    this.destroyQueue = [];
  }

  // ── 고정 스텝 갱신 — 메인 루프가 PLAYING에서만 호출한다 (M15·M18) ──

  tick(dtMs: number): void {
    if (!this.stage) return;
    this.physics.step(dtMs);
    this.processDestroyQueue();
    this.effects.update(dtMs);

    // 판정 체크는 매 틱 (§9 h5): 잔여 돼지 0 → CLEAR
    if (this.remainingPigs === 0) {
      this.clearStage();
      return;
    }

    // 턴 종료 감지 (M11): 전 동적 바디 정지 45프레임 연속 또는 발사 후 8초
    if (this.phase === 'FLYING' || this.phase === 'SETTLING') {
      this.turnElapsed += dtMs;
      let allStill = true;
      this.physics.eachDynamic((_id, s) => {
        if (s.speed >= CFG.stopSpeed) allStill = false;
      });
      this.stillFrames = allStill ? this.stillFrames + 1 : 0;
      if (this.stillFrames >= CFG.stopFrames || this.turnElapsed >= CFG.turnTimeoutMs) {
        this.endTurn();
      }
    }
  }

  /** 정산 (M11·M12): 돼지 0 → CLEAR / 새 남음 → 다음 장전 / 아니면 FAIL */
  private endTurn(): void {
    if (this.activeBirdId !== null) {
      this.entities.delete(this.activeBirdId);
      this.physics.remove(this.activeBirdId);
      this.activeBirdId = null;
    }
    if (this.remainingPigs === 0) {
      this.clearStage(); // 방어적 — 정상 경로는 tick의 매 틱 체크
      return;
    }
    if (this.birdsLeft > 0) {
      this.birdPos = { x: SLING.x, y: SLING.y }; // 다음 새 장전
      this.phase = 'AIMING';
      this.turnElapsed = 0;
      this.stillFrames = 0;
    } else {
      this.failStage();
    }
  }

  /** 점수·별 (M13): 잔여 새 보너스 합산 → starScores 임계로 별 산정 → 저장 (M4) */
  private clearStage(): void {
    if (!this.stage) return;
    this.score += this.birdsLeft * SCORE.birdBonus;
    const [two, three] = this.stage.starScores;
    const stars = this.score >= three ? 3 : this.score >= two ? 2 : 1;
    recordClear(this.stageId, stars, this.score);
    this.lastResult = { stars, score: this.score };
    audio.playClear();
    goTo('CLEAR');
  }

  private failStage(): void {
    this.lastResult = { stars: 0, score: this.score };
    audio.playFail();
    goTo('FAIL');
  }
}
