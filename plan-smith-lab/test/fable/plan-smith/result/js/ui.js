// DOM UI — 화면/오버레이 표시는 앱 상태의 순수 함수(sync)로만 바뀐다.

const $ = (id) => document.getElementById(id);

const PROGRESS_KEY = 'slingshot-strike-progress';

export function loadProgress() {
  try { return new Set(JSON.parse(localStorage.getItem(PROGRESS_KEY) || '[]')); }
  catch { return new Set(); }
}

export function saveProgress(clearedSet) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify([...clearedSet])); }
  catch { /* 프라이빗 모드 등 — 진행 저장은 장식 기능 */ }
}

export function createUI(actions) {
  const el = {
    hud: $('hud'),
    hudStage: $('hud-stage'),
    hudBirds: $('hud-birds'),
    hudPigs: $('hud-pigs'),
    btnPause: $('btn-pause'),
    screenMain: $('screen-main'),
    stageGrid: $('stage-grid'),
    overlayPause: $('overlay-pause'),
    overlayClear: $('overlay-clear'),
    overlayFail: $('overlay-fail'),
    clearStats: $('clear-stats'),
    btnNext: $('btn-next'),
  };

  // 버튼 배선 — 상태 전이는 전부 actions(상태 머신)로 위임
  el.btnPause.addEventListener('click', actions.pause);
  $('btn-resume').addEventListener('click', actions.resume);
  $('btn-pause-restart').addEventListener('click', actions.restart);
  $('btn-pause-main').addEventListener('click', actions.toMain);
  $('btn-next').addEventListener('click', actions.next);
  $('btn-clear-restart').addEventListener('click', actions.restart);
  $('btn-clear-main').addEventListener('click', actions.toMain);
  $('btn-fail-restart').addEventListener('click', actions.restart);
  $('btn-fail-main').addEventListener('click', actions.toMain);

  function buildStageGrid(stages, clearedSet) {
    el.stageGrid.innerHTML = '';
    stages.forEach((stage, i) => {
      const btn = document.createElement('button');
      btn.className = 'stage-btn';
      btn.textContent = String(stage.id);
      btn.setAttribute('aria-label', `스테이지 ${stage.id} ${stage.name}`);
      const name = document.createElement('span');
      name.className = 'stage-name';
      name.textContent = stage.name;
      btn.appendChild(name);
      if (clearedSet.has(stage.id)) {
        const check = document.createElement('span');
        check.className = 'check';
        check.textContent = '✓';
        btn.appendChild(check);
      }
      btn.addEventListener('click', () => actions.startStage(i));
      el.stageGrid.appendChild(btn);
    });
  }

  const show = (node, visible) => node.classList.toggle('hidden', !visible);

  function sync(app) {
    show(el.screenMain, app.state === 'main');
    show(el.hud, app.state === 'playing' || app.state === 'paused');
    show(el.overlayPause, app.state === 'paused');
    show(el.overlayClear, app.state === 'clear');
    show(el.overlayFail, app.state === 'fail');

    if (app.state === 'clear' && app.session) {
      el.clearStats.textContent =
        `사용한 새 ${app.session.shotsFired}마리 · 남은 새 ${app.session.birdsLeft}마리`;
      show(el.btnNext, app.stageIndex + 1 < app.stages.length);
    }
  }

  function updateHUD(app) {
    if (!app.session) return;
    const stage = app.stages[app.stageIndex];
    el.hudStage.textContent = `STAGE ${stage.id} · ${stage.name}`;
    el.hudBirds.textContent = `🔴 ${app.session.birdsLeft}`;
    el.hudPigs.textContent = `🟢 ${app.session.pigsLeft}`;
  }

  return { sync, updateHUD, buildStageGrid };
}
