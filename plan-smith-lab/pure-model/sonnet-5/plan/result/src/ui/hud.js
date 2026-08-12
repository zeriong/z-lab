/**
 * 계획서 §3-2: 인게임 HUD(스테이지명, 남은 새 개수, 점수). 우측 일시정지 버튼은 overlays.js가 관리한다.
 */
export function createHud() {
  const el = {
    stageName: document.getElementById('hud-stage-name'),
    birds: document.getElementById('hud-birds'),
    score: document.getElementById('hud-score'),
  };

  /**
   * @param {{ stageName: string, birdsTotal: number, birdsUsed: number, score: number }} state
   */
  function update({ stageName, birdsTotal, birdsUsed, score }) {
    el.stageName.textContent = stageName;
    el.score.textContent = `SCORE ${score}`;
    el.birds.innerHTML = '';
    for (let i = 0; i < birdsTotal; i += 1) {
      const icon = document.createElement('span');
      icon.className = 'bird-icon' + (i < birdsUsed ? ' used' : '');
      el.birds.appendChild(icon);
    }
  }

  return { update };
}
