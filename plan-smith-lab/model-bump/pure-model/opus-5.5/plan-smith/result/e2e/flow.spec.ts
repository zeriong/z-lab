// flow: 메인 → 게임 시작 → 스테이지 1 → 우측 상단 일시정지 → 다시하기 / 메인으로 (요청 ③)
import { dragPull, expect, startStage1, test } from './fixtures';

test('menu → stage 1, pause button placement, restart restores birds, main hides HUD', async ({ page }) => {
  await page.goto('/');
  const app = page.locator('#app');
  await startStage1(page);

  // 일시정지 버튼은 게임 영역(레터박스 안쪽)의 우측 상단
  const area = await page.locator('#ui').boundingBox();
  const pause = page.getByTestId('btn-pause');
  await expect(pause).toBeVisible();
  const pb = await pause.boundingBox();
  expect(area).not.toBeNull();
  expect(pb).not.toBeNull();
  const cx = pb!.x + pb!.width / 2;
  const cy = pb!.y + pb!.height / 2;
  expect(cx).toBeGreaterThanOrEqual(area!.x + 0.75 * area!.width);
  expect(cy).toBeLessThanOrEqual(area!.y + 0.2 * area!.height);
  expect(Math.round(pb!.width)).toBe(56);
  expect(Math.round(pb!.height)).toBe(56);
  await expect(pause).toHaveAttribute('aria-label', '일시정지');

  // 일시정지 → 세 버튼
  await pause.click();
  await expect(app).toHaveAttribute('data-scene', 'PAUSED');
  await expect(page.getByTestId('btn-resume')).toBeVisible();
  await expect(page.getByTestId('btn-restart')).toBeVisible();
  await expect(page.getByTestId('btn-main')).toBeVisible();
  await page.getByTestId('btn-resume').click();
  await expect(app).toHaveAttribute('data-scene', 'PLAYING');

  // ESC 토글
  await page.keyboard.press('Escape');
  await expect(app).toHaveAttribute('data-scene', 'PAUSED');
  await page.keyboard.press('Escape');
  await expect(app).toHaveAttribute('data-scene', 'PLAYING');

  // 한 발 쏜 뒤 (약한 사격 — 스테이지가 끝나지 않게) 일시정지 → 다시하기
  await dragPull(page, { x: 40, y: 0 });
  await expect(app).toHaveAttribute('data-birds-left', '2');
  await page.getByTestId('btn-pause').click();
  await expect(app).toHaveAttribute('data-scene', 'PAUSED');
  await page.getByTestId('btn-restart').click();
  await expect(app).toHaveAttribute('data-scene', 'PLAYING');
  await expect(app).toHaveAttribute('data-birds-left', '3');
  await expect(app).toHaveAttribute('data-phase', 'AIMING');

  // 일시정지 → 메인으로: 메인 메뉴, HUD 없음
  await page.getByTestId('btn-pause').click();
  await page.getByTestId('btn-main').click();
  await expect(app).toHaveAttribute('data-scene', 'MAIN_MENU');
  await expect(page.getByTestId('hud')).toHaveCount(0);
  await expect(page.getByTestId('btn-pause')).toHaveCount(0);
  await expect(page.getByTestId('btn-start')).toBeVisible();
});

test('locked stages cannot be entered', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId('btn-start').click();
  await expect(page.getByTestId('btn-stage-2')).toBeDisabled();
  await expect(page.locator('.stage-btn')).toHaveCount(10);
  await page.getByTestId('btn-back').click();
  await expect(page.locator('#app')).toHaveAttribute('data-scene', 'MAIN_MENU');
});
