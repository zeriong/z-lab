// launch: 실제 마우스 드래그로 스테이지 1을 클리어한다 (§6 경로 hop 1–5 전부)
import { stage01 } from '../src/stages/stage01';
import { dragPull, expect, readAppAttributes, recordAppAttributes, startStage1, test } from './fixtures';

test('real mouse drag launches the bird and clears stage 1', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const app = page.locator('#app');
  await startStage1(page);

  // 데미지 유예(60스텝 = 1초)가 지난 뒤에 쏜다
  await page.waitForTimeout(1200);
  await recordAppAttributes(page);
  const released = await page.evaluate(() => performance.now());
  await dragPull(page, stage01.solution[0]!.pull);

  // 90프레임(1.5초) 안에 FLYING, 남은 새 1 감소
  await expect.poll(async () => (await readAppAttributes(page)).some((r) => r.phase === 'FLYING'), { timeout: 3000 }).toBe(true);
  const log = await readAppAttributes(page);
  const flying = log.find((r) => r.phase === 'FLYING')!;
  expect(flying.t - released).toBeLessThan(1500 + 1000); // 드래그 자체에 드는 시간 여유 포함
  expect(flying.birds).toBe('2');

  await expect(app).toHaveAttribute('data-scene', 'RESULT_CLEAR', { timeout: 20_000 });
  await expect(page.getByTestId('result-panel')).toBeVisible();
  await expect(page.getByTestId('btn-next')).toBeVisible();
  const stars = Number(await page.getByTestId('result-stars').getAttribute('data-stars'));
  expect(stars).toBeGreaterThanOrEqual(1);
});
