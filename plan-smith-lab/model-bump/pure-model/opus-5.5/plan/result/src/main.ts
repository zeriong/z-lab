import './ui/ui.css';
import { STAGES } from '../stages';
import { App } from './app/App';
import type { StageData } from './core/stage/schema';
import { deepFreeze } from './core/stage/schema';
import { validateStageSet } from './core/stage/validate';
import { detectLocalStorage, ProgressStore } from './storage/progress';

/**
 * 부트 (§6.2): 스테이지 10개를 검증한 뒤 App을 만든다.
 * 검증에 실패하면 화면에 오류를 보여 주고 멈춘다.
 */

const DEV_OR_TEST = import.meta.env.DEV || import.meta.env.MODE === 'test';

function showBootError(title: string, lines: string[]): void {
  const box = document.createElement('pre');
  box.className = 'boot-error';
  box.setAttribute('data-testid', 'boot-error');
  box.textContent = `${title}\n\n${lines.join('\n')}`;
  document.body.append(box);
}

function boot(): void {
  const mount = document.getElementById('app');
  if (!mount) return;

  const result = validateStageSet(STAGES);
  if (!result.ok) {
    showBootError('스테이지 데이터 검증 실패', result.errors);
    return;
  }

  // dev 빌드에서는 원본 스테이지 데이터를 동결해 실수로 수정하는 것을 막는다.
  const stages: readonly StageData[] = import.meta.env.DEV ? deepFreeze(STAGES) : STAGES;

  const params = new URLSearchParams(window.location.search);
  const unlockAll = params.get('unlock') === 'all';
  const stageParam = DEV_OR_TEST ? Number(params.get('stage')) : NaN;
  const startStage = Number.isInteger(stageParam) && stageParam >= 1 && stageParam <= stages.length ? stageParam : null;

  const progress = new ProgressStore(detectLocalStorage(), { total: stages.length, unlockAll });
  const app = new App(mount, stages, progress, {
    debug: params.get('debug') === '1',
    startStage,
  });

  if (DEV_OR_TEST && params.get('test') === '1') {
    void import('./app/testHook').then((m) => m.installTestHook(app));
  }
}

boot();
