/**
 * 새총 기하 (§6.1, §8.4). 물리 바디가 아니라 렌더·입력용 좌표만 가진다.
 * 새는 앵커에 정지하고, 고무줄은 뒤 가지 끝 → 새 → 앞 가지 끝 순으로 그린다.
 */
import { ANCHOR, GROUND_Y } from '../core/config';
import type { Vec } from '../core/math';

export interface SlingshotGeometry {
  anchor: Vec;
  /** 기둥 밑동 (지면) */
  base: Vec;
  /** Y 자 갈라지는 지점 */
  fork: Vec;
  /** 뒤쪽 가지 끝 (새 뒤에 그려짐) */
  backTip: Vec;
  /** 앞쪽 가지 끝 (새 앞에 그려짐) */
  frontTip: Vec;
}

export const SLINGSHOT: Readonly<SlingshotGeometry> = Object.freeze({
  anchor: { x: ANCHOR.x, y: ANCHOR.y },
  base: { x: ANCHOR.x, y: GROUND_Y },
  fork: { x: ANCHOR.x, y: ANCHOR.y + 34 },
  backTip: { x: ANCHOR.x - 16, y: ANCHOR.y - 10 },
  frontTip: { x: ANCHOR.x + 16, y: ANCHOR.y - 6 },
});
