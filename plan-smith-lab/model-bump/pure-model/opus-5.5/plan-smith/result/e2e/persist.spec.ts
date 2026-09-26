// persist: 클리어 후 새로고침해도 해금·별 유지, 음소거도 유지 (R18, R20)
import { stage01 } from '../src/stages/stage01';
import { dragPull, expect, startStage1, test } from './fixtures';

test('progress and mute survive a reload', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const app = page.locator('#app');

  await startStage1(page);
  await page.waitForTimeout(1200);
  await dragPull(page, stage01.solution[0]!.pull);
  await expect(app).toHaveAttribute('data-scene', 'RESULT_CLEAR', { timeout: 20_000 });

  await page.reload();
  await expect(app).toHaveAttribute('data-scene', 'MAIN_MENU');
  await page.getByTestId('btn-start').click();
  await expect(page.getByTestId('btn-stage-2')).toBeEnabled();
  const stars = Number(await page.getByTestId('btn-stage-1').getAttribute('data-stars'));
  expect(stars).toBeGreaterThanOrEqual(1);

  // 음소거
  await page.getByTestId('btn-back').click();
  const mute = page.getByTestId('btn-mute');
  await expect(mute).toHaveAttribute('aria-pressed', 'false');
  await mute.click();
  await expect(mute).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByTestId('btn-mute')).toHaveAttribute('aria-pressed', 'true');
});

test('blocked/corrupt storage still boots with stage 1 only', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('slingshot-bird.save.v1', '{broken'));
  await page.reload();
  await page.getByTestId('btn-start').click();
  await expect(page.getByTestId('btn-stage-1')).toBeEnabled();
  await expect(page.getByTestId('btn-stage-2')).toBeDisabled();
});
