import { expect, test, type Page } from '@playwright/test';
import { SOLUTIONS } from '../src/stages/solutions';

// Playwright는 테스트마다 새 브라우저 컨텍스트(빈 localStorage)를 쓰므로 별도 초기화가 필요 없다.
const VIEW_W = 1920;

async function gotoMain(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('#main-screen')).toBeVisible();
  await page.waitForFunction(() => typeof window.__ab !== 'undefined');
}

async function startStageViaUi(page: Page, id: number): Promise<void> {
  await page.click('#btn-start');
  await expect(page.locator('#select-screen')).toBeVisible();
  await page.click(`.stage-card[data-stage="${id}"]`);
  await expect.poll(() => page.evaluate(() => window.__ab!.state())).toBe('PLAYING');
}

async function birdScreenPos(page: Page): Promise<{ x: number; y: number }> {
  const box = await page.locator('#stage').boundingBox();
  if (!box) throw new Error('#stage has no bounding box');
  const pos = await page.evaluate(() => window.__ab!.birdPos());
  if (!pos) throw new Error('no bird on the slingshot');
  const scale = box.width / VIEW_W;
  return { x: box.x + pos.x * scale, y: box.y + pos.y * scale };
}

async function waitIdleOrResult(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const s = window.__ab!.state();
      return s === 'CLEARED' || s === 'FAILED' || window.__ab!.idle();
    },
    undefined,
    { timeout: 20_000 },
  );
}

/** 솔루션 발사 벡터를 순서대로 쏘고 결과 상태까지 기다린다. */
async function playSolution(page: Page, shots: ReadonlyArray<{ x: number; y: number }>): Promise<void> {
  for (const shot of shots) {
    await waitIdleOrResult(page);
    if ((await page.evaluate(() => window.__ab!.state())) !== 'PLAYING') break;
    expect(await page.evaluate((s) => window.__ab!.launch(s.x, s.y), shot)).toBe(true);
    await page.waitForTimeout(100);
    await waitIdleOrResult(page);
  }
  await waitIdleOrResult(page);
}

test.describe('slingshot birds', () => {
  test('(a) drag-release moves the bird >= 200px to the right within 500ms', async ({ page }) => {
    await gotoMain(page);
    await startStageViaUi(page, 1);
    const start = await page.evaluate(() => window.__ab!.birdPos());
    const p = await birdScreenPos(page);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) await page.mouse.move(p.x - 10 * i, p.y + 10 * i);
    await page.mouse.up();
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => window.__ab!.flyingBirdPos());
    expect(after).not.toBeNull();
    expect(after!.x).toBeGreaterThanOrEqual(start!.x + 200);
  });

  test('(b) pause button is on the right, freezes the world, retry/main work', async ({ page }) => {
    await gotoMain(page);
    await startStageViaUi(page, 1);

    const stageBox = (await page.locator('#stage').boundingBox())!;
    const btnBox = (await page.locator('#btn-pause').boundingBox())!;
    const centerX = btnBox.x + btnBox.width / 2 - stageBox.x;
    expect(centerX).toBeGreaterThanOrEqual(stageBox.width * 0.8);

    expect(await page.evaluate(() => window.__ab!.launch(-64, 64))).toBe(true);
    await page.waitForTimeout(150);
    await page.click('#btn-pause');
    await expect(page.locator('#pause-overlay')).toBeVisible();
    expect(await page.evaluate(() => window.__ab!.state())).toBe('PAUSED');
    const frozen = await page.evaluate(() => window.__ab!.flyingBirdPos());
    expect(frozen).not.toBeNull();
    await page.waitForTimeout(500);
    const still = await page.evaluate(() => window.__ab!.flyingBirdPos());
    expect(still).toEqual(frozen);

    await page.click('#btn-retry');
    await expect.poll(() => page.evaluate(() => window.__ab!.state())).toBe('PLAYING');
    expect(await page.evaluate(() => window.__ab!.stageId())).toBe(1);
    expect(await page.evaluate(() => window.__ab!.birdsRemaining())).toBe(5);

    await page.click('#btn-pause');
    await page.click('#btn-main');
    await expect.poll(() => page.evaluate(() => window.__ab!.state())).toBe('MAIN');
    await expect(page.locator('#main-screen')).toBeVisible();
  });

  for (const sol of SOLUTIONS) {
    test(`(c) stage ${sol.stageId} is cleared by its solution script`, async ({ page }) => {
      test.setTimeout(180_000);
      await gotoMain(page);
      await page.evaluate((id) => window.__ab!.startStage(id), sol.stageId);
      await expect.poll(() => page.evaluate(() => window.__ab!.state())).toBe('PLAYING');
      await playSolution(page, sol.shots);
      await expect.poll(() => page.evaluate(() => window.__ab!.state()), { timeout: 15_000 }).toBe('CLEARED');
      await expect(page.locator('#result-overlay')).toBeVisible();
      await expect(page.locator('#result-overlay')).toHaveAttribute('data-result', 'cleared');
    });
  }

  test('(d) progress survives a reload and locked cards ignore clicks', async ({ page }) => {
    await gotoMain(page);
    await page.evaluate(() => window.__ab!.startStage(1));
    await expect.poll(() => page.evaluate(() => window.__ab!.state())).toBe('PLAYING');
    await playSolution(page, SOLUTIONS[0]!.shots);
    await expect.poll(() => page.evaluate(() => window.__ab!.state()), { timeout: 15_000 }).toBe('CLEARED');
    expect(await page.evaluate(() => window.localStorage.getItem('ab.save.v1'))).not.toBeNull();

    await page.reload();
    await expect(page.locator('#main-screen')).toBeVisible();
    await page.click('#btn-start');
    await expect(page.locator('.stage-card[data-stage="2"]')).toHaveAttribute('data-locked', 'false');
    await expect(page.locator('.stage-card[data-stage="3"]')).toHaveAttribute('data-locked', 'true');
    await page.click('.stage-card[data-stage="3"]');
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.__ab!.state())).toBe('SELECT');
  });

  test('(e) production build serves the main screen', async ({ page }) => {
    await page.goto('http://localhost:4173/');
    await expect(page.locator('#main-screen')).toBeVisible();
  });

  test('portrait viewport shows the rotate overlay', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('#rotate-overlay')).toBeVisible();
    await context.close();
  });
});
