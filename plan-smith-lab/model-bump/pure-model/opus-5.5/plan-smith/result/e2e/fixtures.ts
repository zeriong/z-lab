// 공용 E2E 도구: console.error·pageerror 0건 검사(D6) + 월드 좌표 → 페이지 좌표 변환 + 실제 마우스 드래그
import { test as base, expect, type Page } from '@playwright/test';
import { ANCHOR, WORLD_H, WORLD_W } from '../src/config';

export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      page.on('pageerror', (e) => errors.push(String(e)));
      await use(errors);
      expect(errors, 'console.error / pageerror during the test (D6)').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** config.ts 상수와 캔버스 bounding box만으로 월드 → 페이지 좌표를 계산한다 */
export async function worldToPage(page: Page, p: { x: number; y: number }): Promise<{ x: number; y: number }> {
  const box = await page.locator('#game').boundingBox();
  if (!box) throw new Error('canvas not visible');
  const scale = Math.min(box.width / WORLD_W, box.height / WORLD_H);
  const ox = box.x + (box.width - WORLD_W * scale) / 2;
  const oy = box.y + (box.height - WORLD_H * scale) / 2;
  return { x: ox + p.x * scale, y: oy + p.y * scale };
}

/** 새 중심(앵커)을 눌러 pull만큼 뒤로 끌었다 놓는다 (pull = anchor − pointer) */
export async function dragPull(page: Page, pull: { x: number; y: number }): Promise<void> {
  const a = await worldToPage(page, ANCHOR);
  const b = await worldToPage(page, { x: ANCHOR.x - pull.x, y: ANCHOR.y - pull.y });
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 6 });
  await page.mouse.move(b.x, b.y, { steps: 6 });
  await page.mouse.up();
}

/** #app의 data-* 속성 변화를 기록한다 (짧게 스쳐 가는 phase도 놓치지 않게) */
export async function recordAppAttributes(page: Page): Promise<void> {
  await page.evaluate(() => {
    const app = document.getElementById('app')!;
    const w = window as unknown as { __attrLog: Array<{ t: number; phase: string; birds: string; scene: string }> };
    w.__attrLog = [];
    const push = () =>
      w.__attrLog.push({
        t: performance.now(),
        phase: app.dataset['phase'] ?? '',
        birds: app.dataset['birdsLeft'] ?? '',
        scene: app.dataset['scene'] ?? '',
      });
    push();
    new MutationObserver(push).observe(app, { attributes: true });
  });
}

export async function readAppAttributes(page: Page): Promise<Array<{ t: number; phase: string; birds: string; scene: string }>> {
  return page.evaluate(() => (window as unknown as { __attrLog: Array<{ t: number; phase: string; birds: string; scene: string }> }).__attrLog);
}

export async function startStage1(page: Page): Promise<void> {
  const app = page.locator('#app');
  await expect(app).toHaveAttribute('data-scene', 'MAIN_MENU');
  await page.getByTestId('btn-start').click();
  await expect(app).toHaveAttribute('data-scene', 'STAGE_SELECT');
  await page.getByTestId('btn-stage-1').click();
  await expect(app).toHaveAttribute('data-scene', 'PLAYING');
  await expect(app).toHaveAttribute('data-phase', 'AIMING');
}
