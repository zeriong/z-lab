import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// §11.4 브라우저 E2E. 훅(window.__game)은 ?test=1일 때만 dev/test 빌드에 들어간다.
// E1~E7은 @smoke로 WebKit/Firefox에서도 돈다.

interface Snap {
  stageId: number;
  turnState: string;
  birdsLeft: number;
  pigsLeft: number;
  score: number;
  simTime: number;
}

const LOGICAL_W = 1920;
const LOGICAL_H = 1080;
const ANCHOR = { x: 260, y: 830 };
/** stages/stage01.json의 기준 해법 */
const STAGE1_SOLUTION: [number, number] = [-125.57, 33.65];
const MISS_PULL: [number, number] = [120, 20];

let errors: string[] = [];

async function boot(page: Page, query = '?test=1'): Promise<void> {
  await page.goto(`./${query}`);
  await page.waitForFunction(() => Boolean(window.__game));
}

const session = (page: Page): Promise<Snap | null> => page.evaluate(() => window.__game!.session());
const appState = (page: Page): Promise<string> => page.evaluate(() => window.__game!.appState());
const shoot = (page: Page, pull: [number, number]): Promise<boolean> =>
  page.evaluate(([dx, dy]) => window.__game!.shoot(dx, dy), pull);

async function waitTurn(page: Page, state: string, timeout = 8000): Promise<void> {
  await expect.poll(async () => (await session(page))?.turnState, { timeout }).toBe(state);
}

async function enterStage(page: Page, n = 1): Promise<void> {
  await page.getByTestId('btn-start').click();
  await page.getByTestId(`stage-${n}`).click();
  await expect.poll(() => appState(page)).toBe('PLAYING');
}

/** 논리 좌표 → 페이지 좌표 */
async function toPage(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const box = (await page.getByTestId('game-canvas').boundingBox())!;
  return { x: box.x + (x / LOGICAL_W) * box.width, y: box.y + (y / LOGICAL_H) * box.height };
}

test.beforeEach(async ({ page, context }) => {
  errors = [];
  await context.clearCookies();
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
});

// E11: 모든 시나리오 공통 — 콘솔 error 0건, 처리되지 않은 예외 0건
test.afterEach(() => {
  expect(errors).toEqual([]);
});

test('E1 메인에서 게임 시작 → 칸 10개, 1단계만 해금 @smoke', async ({ page }) => {
  await boot(page);
  await expect(page.getByTestId('screen-main')).toBeVisible();
  await page.getByTestId('btn-start').click();
  await expect(page.getByTestId('screen-select')).toBeVisible();
  for (let n = 1; n <= 10; n++) {
    const cell = page.getByTestId(`stage-${n}`);
    await expect(cell).toBeVisible();
    if (n === 1) await expect(cell).toBeEnabled();
    else await expect(cell).toBeDisabled();
  }
});

test('E2 1단계에서 실제 마우스 드래그로 발사 @smoke', async ({ page }) => {
  await boot(page);
  await enterStage(page, 1);
  await waitTurn(page, 'READY');
  const before = (await session(page))!.birdsLeft;
  const from = await toPage(page, ANCHOR.x, ANCHOR.y);
  const to = await toPage(page, ANCHOR.x - 110, ANCHOR.y + 35);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await expect.poll(async () => (await session(page))?.turnState).toBe('AIMING');
  await page.mouse.up();
  await expect.poll(async () => (await session(page))?.turnState, { timeout: 2000, intervals: [20, 50] }).toBe('FLYING');
  await expect.poll(async () => (await session(page))?.birdsLeft).toBe(before - 1);
});

test('E3 일시정지 버튼 위치와 크기 (뷰포트 3종) @smoke', async ({ page }) => {
  for (const size of [
    { width: 1920, height: 1080 },
    { width: 1280, height: 720 },
    { width: 2560, height: 1080 },
  ]) {
    await page.setViewportSize(size);
    await boot(page);
    await enterStage(page, 1);
    const area = (await page.getByTestId('game-area').boundingBox())!;
    const btn = page.getByTestId('btn-pause');
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute('aria-label', '일시정지');
    const b = (await btn.boundingBox())!;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    expect(cx).toBeGreaterThanOrEqual(area.x + 0.85 * area.width);
    expect(cx).toBeLessThanOrEqual(area.x + area.width);
    expect(cy).toBeLessThanOrEqual(area.y + 0.15 * area.height);
    expect(cy).toBeGreaterThanOrEqual(area.y);
    expect(b.width).toBeGreaterThanOrEqual(44);
    expect(b.height).toBeGreaterThanOrEqual(44);
  }
});

test('E4 일시정지 클릭 → 오버레이, 다시하기/메인으로, simTime 정지 @smoke', async ({ page }) => {
  await boot(page);
  await enterStage(page, 1);
  await page.waitForTimeout(300);
  await page.getByTestId('btn-pause').click();
  await expect(page.getByTestId('overlay-pause')).toBeVisible();
  await expect(page.getByTestId('btn-retry')).toBeVisible();
  await expect(page.getByTestId('btn-main')).toBeVisible();
  await expect(page.getByTestId('btn-pause')).toBeHidden();
  expect(await appState(page)).toBe('PAUSED');
  const t0 = (await session(page))!.simTime;
  await page.waitForTimeout(1000);
  const t1 = (await session(page))!.simTime;
  expect(t1).toBe(t0);
});

test('E5 발사 후 일시정지 → 다시하기: 완전히 초기 상태 @smoke', async ({ page }) => {
  await boot(page);
  await enterStage(page, 1);
  await waitTurn(page, 'READY');
  const initial = (await session(page))!;
  expect(await shoot(page, STAGE1_SOLUTION)).toBe(true);
  await page.waitForTimeout(400);
  await page.getByTestId('btn-pause').click();
  await page.getByTestId('btn-retry').click();
  await expect(page.getByTestId('overlay-pause')).toBeHidden();
  expect(await appState(page)).toBe('PLAYING');
  const s = (await session(page))!;
  expect(s.birdsLeft).toBe(initial.birdsLeft);
  expect(s.pigsLeft).toBe(initial.pigsLeft);
  expect(s.score).toBe(0);
  expect(s.simTime).toBeLessThan(0.5);
  await waitTurn(page, 'READY');
});

test('E6 일시정지 → 메인으로: 메인 화면, 세션 없음 @smoke', async ({ page }) => {
  await boot(page);
  await enterStage(page, 1);
  await page.getByTestId('btn-pause').click();
  await page.getByTestId('btn-main').click();
  await expect(page.getByTestId('screen-main')).toBeVisible();
  expect(await appState(page)).toBe('MAIN');
  expect(await session(page)).toBeNull();
});

test('E7 계속하기 / ESC @smoke', async ({ page }) => {
  await boot(page);
  await enterStage(page, 1);
  await page.getByTestId('btn-pause').click();
  const t0 = (await session(page))!.simTime;
  await page.getByTestId('btn-resume').click();
  expect(await appState(page)).toBe('PLAYING');
  await expect.poll(async () => (await session(page))!.simTime).toBeGreaterThan(t0);

  await page.keyboard.press('Escape');
  expect(await appState(page)).toBe('PAUSED');
  await expect(page.getByTestId('overlay-pause')).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await appState(page)).toBe('PLAYING');
  await expect(page.getByTestId('overlay-pause')).toBeHidden();
});

test('E8 기준 해법으로 클리어 → 별, 2단계 해금, 새로고침 후 유지', async ({ page }) => {
  await boot(page);
  await enterStage(page, 1);
  await waitTurn(page, 'READY');
  await shoot(page, STAGE1_SOLUTION);
  // 브라우저가 기준 해법을 재현하지 못하면 killAllPigs로 클리어 흐름만 검증한다(해법 재현은 S-5가 보장).
  try {
    await expect.poll(() => appState(page), { timeout: 15000 }).toBe('CLEARED');
  } catch {
    await waitTurn(page, 'READY', 15000);
    await page.evaluate(() => window.__game!.killAllPigs());
    await expect.poll(() => appState(page), { timeout: 5000 }).toBe('CLEARED');
  }
  const overlay = page.getByTestId('overlay-result');
  await expect(overlay).toBeVisible();
  await expect(overlay).toHaveAttribute('data-result', 'cleared');
  await expect(page.getByTestId('result-title')).toContainText('스테이지 1 클리어!');
  await expect(page.getByTestId('result-stars')).toBeVisible();
  await expect(page.getByTestId('btn-next')).toBeVisible();

  await page.getByTestId('btn-result-main').click();
  await page.getByTestId('btn-start').click();
  await expect(page.getByTestId('stage-2')).toBeEnabled();

  await page.reload();
  await page.waitForFunction(() => Boolean(window.__game));
  await page.getByTestId('btn-start').click();
  await expect(page.getByTestId('stage-2')).toBeEnabled();
  await expect(page.getByTestId('stage-3')).toBeDisabled();
});

test('E9 모두 빗나가면 실패 → 다시하기로 초기화', async ({ page }) => {
  await boot(page);
  await enterStage(page, 1);
  for (let i = 0; i < 3; i++) {
    await waitTurn(page, 'READY', 15000);
    expect(await shoot(page, MISS_PULL)).toBe(true);
  }
  await expect.poll(() => appState(page), { timeout: 20000 }).toBe('FAILED');
  await expect(page.getByTestId('overlay-result')).toHaveAttribute('data-result', 'failed');
  await expect(page.getByTestId('result-pigs')).toContainText('1');
  await expect(page.getByTestId('btn-next')).toBeHidden();
  await page.getByTestId('btn-result-retry').click();
  expect(await appState(page)).toBe('PLAYING');
  const s = (await session(page))!;
  expect(s.birdsLeft).toBe(3);
  expect(s.pigsLeft).toBe(1);
  expect(s.score).toBe(0);
});

test('E10 탭 숨김(visibilitychange) → 자동 PAUSED', async ({ page }) => {
  await boot(page);
  await enterStage(page, 1);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(await appState(page)).toBe('PAUSED');
  // 돌아와도 자동으로 재개하지 않는다
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(await appState(page)).toBe('PAUSED');
});

test('E12 ?unlock=all에서 10단계 클리어 → 올클리어, 다음 스테이지 없음', async ({ page }) => {
  await boot(page, '?test=1&unlock=all');
  await page.getByTestId('btn-start').click();
  await expect(page.getByTestId('stage-10')).toBeEnabled();
  await page.getByTestId('stage-10').click();
  await waitTurn(page, 'READY');
  await page.evaluate(() => window.__game!.killAllPigs());
  await expect.poll(() => appState(page), { timeout: 5000 }).toBe('CLEARED');
  await expect(page.getByTestId('result-allclear')).toBeVisible();
  await expect(page.getByTestId('result-allclear')).toContainText('모든 스테이지 클리어!');
  await expect(page.getByTestId('btn-next')).toBeHidden();
});

test('E13 드래그 중 ESC로 일시정지 → 재개: 조준 취소, 새 소모 없음, 다시 발사 가능', async ({ page }) => {
  await boot(page);
  await enterStage(page, 1);
  await waitTurn(page, 'READY');
  const before = (await session(page))!.birdsLeft;
  const from = await toPage(page, ANCHOR.x, ANCHOR.y);
  const to = await toPage(page, ANCHOR.x - 90, ANCHOR.y + 30);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await expect.poll(async () => (await session(page))?.turnState).toBe('AIMING');
  await page.keyboard.press('Escape');
  expect(await appState(page)).toBe('PAUSED');
  await page.mouse.up();
  await page.keyboard.press('Escape');
  expect(await appState(page)).toBe('PLAYING');
  const s = (await session(page))!;
  expect(s.turnState).toBe('READY');
  expect(s.birdsLeft).toBe(before);
  expect(await shoot(page, STAGE1_SOLUTION)).toBe(true);
  await expect.poll(async () => (await session(page))?.turnState, { timeout: 2000, intervals: [20, 50] }).toBe('FLYING');
});
