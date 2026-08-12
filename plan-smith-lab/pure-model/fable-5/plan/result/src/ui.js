// DOM HUD/오버레이 표시·숨김, 버튼 바인딩 (§5). canvas는 월드만, UI는 DOM (§1.2).

const $ = (id) => document.getElementById(id);

function show(el) {
  el.classList.remove('hidden');
}

function hide(el) {
  el.classList.add('hidden');
}

// handlers: { onStart(stageIndex), onPause, onResume, onRestart, onMain, onNext }
export function initUI(handlers, stageCount) {
  $('btn-start').addEventListener('click', () => handlers.onStart(0));

  // 스테이지 선택 그리드 1~10 — 전부 즉시 선택 가능 (§5.1)
  const grid = $('stage-grid');
  for (let i = 0; i < stageCount; i++) {
    const btn = document.createElement('button');
    btn.textContent = String(i + 1);
    btn.addEventListener('click', () => handlers.onStart(i));
    grid.appendChild(btn);
  }

  $('btn-pause').addEventListener('click', handlers.onPause);
  $('btn-resume').addEventListener('click', handlers.onResume);
  $('btn-pause-restart').addEventListener('click', handlers.onRestart);
  $('btn-pause-main').addEventListener('click', handlers.onMain);
  $('btn-next').addEventListener('click', handlers.onNext);
  $('btn-result-restart').addEventListener('click', handlers.onRestart);
  $('btn-result-main').addEventListener('click', handlers.onMain);
}

export function showMain() {
  show($('main-screen'));
  hide($('hud'));
  hide($('pause-overlay'));
  hide($('result-overlay'));
}

export function showPlaying() {
  hide($('main-screen'));
  show($('hud'));
  hide($('pause-overlay'));
  hide($('result-overlay'));
}

export function showPause() {
  show($('pause-overlay'));
}

export function hidePause() {
  hide($('pause-overlay'));
}

// { clear, score, isLast }
export function showResult({ clear, score, isLast }) {
  $('result-title').textContent = clear ? '스테이지 클리어!' : '실패...';
  $('result-score').textContent = `점수 ${score.toLocaleString()}`;
  const next = $('btn-next');
  if (clear && !isLast) show(next);
  else hide(next);
  show($('result-overlay'));
}

// { stage, name, score, birds }
export function updateHUD({ stage, name, score, birds }) {
  $('hud-stage').textContent = `스테이지 ${stage} — ${name}`;
  $('hud-score').textContent = `점수 ${score.toLocaleString()}`;
  const birdsEl = $('hud-birds');
  birdsEl.innerHTML = '';
  birdsEl.appendChild(document.createTextNode('남은 새'));
  for (let i = 0; i < birds; i++) {
    const dot = document.createElement('span');
    dot.className = 'bird-dot';
    birdsEl.appendChild(dot);
  }
  if (birds === 0) birdsEl.appendChild(document.createTextNode(' 없음'));
}
